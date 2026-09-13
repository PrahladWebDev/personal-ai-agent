import { AIProvider } from './AIProvider';
import { GroqProvider } from './GroqProvider';

/**
 * Single place that decides which AIProvider implementation is active.
 * Swap this to add OpenAI/Gemini/Ollama later without touching any
 * controller or the RAG pipeline.
 */
export const aiProvider: AIProvider = new GroqProvider();
export * from './AIProvider';
