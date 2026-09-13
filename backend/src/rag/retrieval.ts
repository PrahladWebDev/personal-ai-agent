import { pool } from '../database/pool';
import { getEmbedding, toVectorLiteral } from '../ai/embeddings';
import { RetrievedChunk } from './promptBuilder';
import { env } from '../config/env';

const SOURCE_LABELS: Record<string, string> = {
  profile: 'Profile',
  document: 'Uploaded Document',
  project: 'Project Knowledge',
  skill: 'Skill',
  experience: 'Work Experience',
  education: 'Education',
  achievement: 'Achievement / Certification',
  certification: 'Certification',
  service: 'Service',
  personal: 'About Me',
  career: 'Career Goals',
};

/**
 * Semantic retrieval over document_chunks with mandatory visibility
 * filtering. `visibility` is ALWAYS constrained server-side based on
 * whether the caller is an authenticated admin - it is never trusted
 * from client input. Public chat always passes 'public' only.
 */
export async function retrieveRelevantChunks(
  query: string,
  opts: { visibility: 'public' | 'public_and_private'; limit?: number } = { visibility: 'public' }
): Promise<RetrievedChunk[]> {
  const limit = opts.limit ?? env.maxContextChunks;
  const embedding = await getEmbedding(query);
  const vectorLiteral = toVectorLiteral(embedding);

  const visibilityClause = opts.visibility === 'public' ? `AND visibility = 'public'` : '';

  const { rows } = await pool.query(
    `SELECT content, source_type, source_id, category, metadata,
            1 - (embedding <=> $1::vector) AS similarity
     FROM document_chunks
     WHERE 1=1 ${visibilityClause}
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    [vectorLiteral, limit]
  );

  // rows are already ORDER BY similarity DESC (closest vector first).
  // A flat `similarity > 0.2` cutoff throws away the whole result set
  // for short or typo'd questions, where even the best-ranked match can
  // score just under the threshold with this small local embedding
  // model - producing a false "not enough information" answer despite
  // the right chunk being right there. Always keep the top couple of
  // ranked candidates; only apply the score floor beyond that.
  const KEEP_TOP_REGARDLESS = 2;
  const MIN_SIMILARITY = 0.2;

  return rows
    .filter((r, i) => i < KEEP_TOP_REGARDLESS || r.similarity > MIN_SIMILARITY)
    .map((r) => ({
      content: r.content,
      sourceType: r.source_type,
      sourceId: r.source_id,
      category: r.category,
      label: labelFor(r.source_type, r.metadata),
    }));
}

function labelFor(sourceType: string, metadata: Record<string, unknown> | null): string {
  const name = (metadata && (metadata as any).name) as string | undefined;
  const base = SOURCE_LABELS[sourceType] || sourceType;
  return name ? `${base}: ${name}` : base;
}
