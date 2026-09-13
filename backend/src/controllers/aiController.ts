import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, fail } from '../utils/apiResponse';
import { pool } from '../database/pool';
import { env } from '../config/env';
import { aiProvider } from '../ai';
import { retrieveRelevantChunks } from '../rag/retrieval';
import { buildMessages } from '../rag/promptBuilder';
import { classifyIntent } from '../ai/intent';
import { buildStructuredContext } from '../rag/contextBuilder';
import { getAiInstructions } from '../rag/knowledgeBase';
import { reindexAllKnowledge } from '../rag/reindexAll';
import { isSuspiciousInput, sanitizeForPrompt } from '../security/promptInjection';
import { logger } from '../utils/logger';

const REFUSAL_MESSAGE =
  "I can't help with that. I'm only able to discuss my knowledge base and can't reveal internal instructions, credentials, or private data.";

/**
 * Public AI chat endpoint. Streams the answer via Server-Sent Events so
 * the frontend can render tokens as they arrive, and always finishes
 * with a `sources` event so the UI can render source cards without
 * exposing private content (retrieval is 'public'-only, enforced
 * server-side - never trusts any visibility flag from the client).
 */
export const chat = asyncHandler(async (req: Request, res: Response) => {
  const { message, conversationId } = req.body as { message?: string; conversationId?: string };

  if (!message || !message.trim()) {
    return fail(res, 'A message is required', 'MISSING_MESSAGE', 422);
  }
  if (message.length > env.maxQuestionLength) {
    return fail(res, `Message too long (max ${env.maxQuestionLength} characters)`, 'MESSAGE_TOO_LONG', 422);
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  if (isSuspiciousInput(message)) {
    logger.info('Blocked suspicious chat input', { conversationId });
    send('token', REFUSAL_MESSAGE);
    send('sources', []);
    send('done', { conversationId: conversationId || null });
    return res.end();
  }

  const sanitized = sanitizeForPrompt(message);

  const convoId = conversationId || uuidv4();
  await ensureConversation(convoId);

  const history = await loadHistory(convoId);

  // Hybrid retrieval: classify intent -> pull exact/structured sections
  // for anything the intent says is relevant (counts/lists are always
  // exact DB queries, never vector similarity), AND run semantic search
  // over document_chunks (uploaded docs, README text, narrative content)
  // so free-form / cross-cutting questions still get useful context.
  const intent = classifyIntent(sanitized);
  const [{ rows: profileRows }, structuredSections, chunks, aiInstructions] = await Promise.all([
    pool.query('SELECT name FROM profile ORDER BY updated_at DESC LIMIT 1'),
    buildStructuredContext(intent, sanitized),
    retrieveRelevantChunks(sanitized, { visibility: 'public' }),
    getAiInstructions(),
  ]);
  const profileName = profileRows[0]?.name || '';

  const messages = buildMessages(profileName, sanitized, structuredSections, chunks, history, aiInstructions);

  let fullAnswer = '';
  try {
    fullAnswer = await aiProvider.generateAnswer({
      messages,
      stream: true,
      onToken: (token) => send('token', token),
    });
  } catch (err) {
    logger.error('Chat generation failed', { error: (err as Error).message });
    send('token', "I'm having trouble generating an answer right now. Please try again shortly.");
  }

  const sources = chunks.map((c) => ({ sourceType: c.sourceType, sourceId: c.sourceId, label: c.label }));
  send('sources', sources);
  send('done', { conversationId: convoId });
  res.end();

  await Promise.all([
    saveMessage(convoId, 'user', message),
    saveMessage(convoId, 'assistant', fullAnswer, sources),
    pool.query('INSERT INTO chat_analytics (question, had_answer) VALUES ($1, $2)', [
      message,
      chunks.length > 0,
    ]),
  ]).catch((err) => logger.error('Failed to persist conversation', { error: (err as Error).message }));
});

/** Debug/admin endpoint from Phase 2 of the build plan: lets the admin
 * verify retrieval quality directly without going through the LLM. */
export const searchKnowledge = asyncHandler(async (req: Request, res: Response) => {
  const { query, includePrivate } = req.body as { query?: string; includePrivate?: boolean };
  if (!query) return fail(res, 'Query is required', 'MISSING_FIELD', 422);

  const chunks = await retrieveRelevantChunks(query, {
    visibility: includePrivate ? 'public_and_private' : 'public',
  });
  return ok(res, chunks);
});

/**
 * Manual "Re-index knowledge" trigger for the admin dashboard (spec
 * section 16, "Re-indexing"). Rebuilds every structured knowledge
 * section's embeddings from the current database state.
 */
export const reindexKnowledge = asyncHandler(async (_req: Request, res: Response) => {
  const result = await reindexAllKnowledge();
  return ok(res, result);
});

async function ensureConversation(id: string) {
  await pool.query(
    `INSERT INTO conversations (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`,
    [id]
  );
}

async function loadHistory(conversationId: string) {
  const { rows } = await pool.query(
    `SELECT role, content FROM conversation_messages WHERE conversation_id = $1
     ORDER BY created_at DESC LIMIT $2`,
    [conversationId, env.maxConversationHistory]
  );
  return rows.reverse().map((r) => ({ role: r.role as 'user' | 'assistant', content: r.content }));
}

async function saveMessage(conversationId: string, role: 'user' | 'assistant', content: string, sources: unknown[] = []) {
  await pool.query(
    `INSERT INTO conversation_messages (conversation_id, role, content, sources) VALUES ($1,$2,$3,$4)`,
    [conversationId, role, content, JSON.stringify(sources)]
  );
}
