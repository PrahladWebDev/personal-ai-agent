import { AIProvider, ChatMessage, GenerateAnswerOptions } from './AIProvider';
import { env } from '../config/env';
import { getEmbedding } from './embeddings';
import { ApiError } from '../middleware/errorHandler';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Groq implementation of AIProvider. Uses the OpenAI-compatible chat
 * completions endpoint. The model name is fully configurable via
 * GROQ_MODEL so a deprecated model is never hard-coded.
 */
export class GroqProvider implements AIProvider {
  async generateAnswer(options: GenerateAnswerOptions): Promise<string> {
    if (!env.groqApiKey) {
      throw new ApiError('AI provider is not configured', 503, 'AI_NOT_CONFIGURED');
    }

    const body = {
      model: env.groqModel,
      messages: options.messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 800,
      stream: Boolean(options.stream && options.onToken),
    };

    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.groqApiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new ApiError(`AI provider request failed (${response.status})`, 502, 'AI_PROVIDER_ERROR');
    }

    if (body.stream && response.body) {
      return this.consumeStream(response.body, options.onToken!);
    }

    const data = (await response.json()) as any;
    return data.choices?.[0]?.message?.content ?? '';
  }

  private async consumeStream(
    body: ReadableStream<Uint8Array>,
    onToken: (token: string) => void
  ): Promise<string> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let full = '';
    let buffer = '';

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.replace(/^data:\s*/, '');
        if (payload === '[DONE]') continue;
        try {
          const json = JSON.parse(payload);
          const token = json.choices?.[0]?.delta?.content;
          if (token) {
            full += token;
            onToken(token);
          }
        } catch {
          // ignore malformed SSE chunk
        }
      }
    }

    return full;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // Groq does not offer an embeddings endpoint; embeddings are generated
    // locally (see ai/embeddings.ts) so this delegates there. Kept on the
    // interface so callers don't need to know which provider does what.
    return getEmbedding(text);
  }
}
