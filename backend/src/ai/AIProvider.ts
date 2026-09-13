/**
 * AIProvider is the single abstraction the rest of the app talks to for
 * LLM generation. No other module should call an AI vendor's SDK/HTTP API
 * directly - only implementations of this interface should.
 *
 * To add a new provider (OpenAI, Gemini, Ollama, etc.), implement this
 * interface and swap it in `ai/index.ts`.
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GenerateAnswerOptions {
  messages: ChatMessage[];
  stream?: boolean;
  onToken?: (token: string) => void;
  maxTokens?: number;
  temperature?: number;
}

export interface AIProvider {
  /** Generate a chat completion. If `stream` + `onToken` are provided, tokens
   * are pushed incrementally; the full text is still returned at the end. */
  generateAnswer(options: GenerateAnswerOptions): Promise<string>;

  /** Generate an embedding vector for a piece of text. */
  generateEmbedding(text: string): Promise<number[]>;
}
