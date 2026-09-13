import { pool } from '../database/pool';
import { chunkText } from './chunker';
import { getEmbeddings, toVectorLiteral } from '../ai/embeddings';

/**
 * Keeps document_chunks in sync with structured knowledge (skills,
 * experience, projects, education, achievements) whenever the admin
 * creates/updates/deletes a record. This is what lets the RAG pipeline
 * retrieve structured data the same way it retrieves uploaded documents.
 */
export async function indexKnowledgeItem(params: {
  sourceType:
    | 'project'
    | 'skill'
    | 'experience'
    | 'education'
    | 'achievement'
    | 'profile'
    | 'certification'
    | 'service'
    | 'personal'
    | 'career';
  sourceId: string;
  name: string;
  text: string;
  visibility: 'public' | 'private';
  category?: string | null;
}) {
  const { sourceType, sourceId, name, text, visibility, category } = params;

  // Re-index from scratch: simplest way to keep chunk count correct on edit.
  await pool.query('DELETE FROM document_chunks WHERE source_type = $1 AND source_id = $2', [
    sourceType,
    sourceId,
  ]);

  const cleaned = text.trim();
  if (!cleaned) return;

  const chunks = chunkText(cleaned, 800, 100);
  const embeddings = await getEmbeddings(chunks);

  for (let i = 0; i < chunks.length; i++) {
    await pool.query(
      `INSERT INTO document_chunks (content, embedding, source_type, source_id, category, visibility, metadata)
       VALUES ($1, $2::vector, $3, $4, $5, $6, $7)`,
      [
        chunks[i],
        toVectorLiteral(embeddings[i]),
        sourceType,
        sourceId,
        category ?? null,
        visibility,
        JSON.stringify({ name, chunkIndex: i }),
      ]
    );
  }
}

export async function deindexKnowledgeItem(sourceType: string, sourceId: string) {
  await pool.query('DELETE FROM document_chunks WHERE source_type = $1 AND source_id = $2', [
    sourceType,
    sourceId,
  ]);
}
