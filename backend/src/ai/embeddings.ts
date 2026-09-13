import { env } from '../config/env';

/**
 * Local embedding generation using transformers.js (@xenova/transformers).
 * Runs entirely on the VPS CPU - no external embedding API, no cost, and
 * no personal data leaves the server just to build vectors. Model is
 * small enough (~90MB, 384-dim output) to run comfortably on a 4GB VPS.
 *
 * The pipeline is loaded once and cached (singleton) since loading it is
 * the expensive part.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let embedderPromise: Promise<any> | null = null;

async function getEmbedder() {
  if (!embedderPromise) {
    embedderPromise = (async () => {
      const { pipeline } = await import('@xenova/transformers');
      return pipeline('feature-extraction', env.embeddingModel);
    })();
  }
  return embedderPromise;
}

export async function getEmbedding(text: string): Promise<number[]> {
  const embedder = await getEmbedder();
  const output = await embedder(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data as Float32Array);
}

export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  for (const text of texts) {
    // Sequential on purpose: keeps memory flat and predictable on a
    // resource-constrained (4GB) VPS rather than loading many texts
    // through the model in parallel.
    results.push(await getEmbedding(text));
  }
  return results;
}

export function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(',')}]`;
}
