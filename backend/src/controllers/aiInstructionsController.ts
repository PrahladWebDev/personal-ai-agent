import { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import { pool } from '../database/pool';
import { AuthedRequest } from '../middleware/auth';

/**
 * AI Instructions are behavior configuration, not knowledge - they are
 * never indexed into document_chunks and never exposed through a public
 * endpoint. They are read server-side only, inside buildMessages(), and
 * are explicitly layered UNDER the hard-coded safety/factual rules (see
 * rag/promptBuilder.ts) so a custom instruction can never turn off the
 * "don't invent facts" / "don't reveal secrets" rules.
 */
export const getAdminAiInstructions = asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const { rows } = await pool.query('SELECT * FROM ai_instructions ORDER BY updated_at DESC LIMIT 1');
  return ok(res, rows[0] ?? null);
});

export const upsertAiInstructions = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const b = req.body;
  const { rows: existing } = await pool.query('SELECT id FROM ai_instructions LIMIT 1');

  const values = [
    b.aiIntroduction || null,
    b.responseStyle || 'concise',
    b.fallbackResponse || null,
    b.includeGithubLinks ?? true,
    b.includeProjectLinks ?? true,
    b.includeContactInfo ?? true,
    b.customInstructions || null,
  ];

  let row;
  if (existing[0]) {
    const { rows } = await pool.query(
      `UPDATE ai_instructions SET ai_introduction=$1, response_style=$2, fallback_response=$3,
        include_github_links=$4, include_project_links=$5, include_contact_info=$6,
        custom_instructions=$7, updated_at=now()
       WHERE id=$8 RETURNING *`,
      [...values, existing[0].id]
    );
    row = rows[0];
  } else {
    const { rows } = await pool.query(
      `INSERT INTO ai_instructions (ai_introduction, response_style, fallback_response,
        include_github_links, include_project_links, include_contact_info, custom_instructions)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      values
    );
    row = rows[0];
  }

  return ok(res, row);
});
