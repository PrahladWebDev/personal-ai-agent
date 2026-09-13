import { pool } from '../database/pool';
import { extractText, cleanText } from './extractText';
import { chunkText } from '../rag/chunker';
import { getEmbeddings, toVectorLiteral } from '../ai/embeddings';
import { logger } from '../utils/logger';

/**
 * Full document processing pipeline:
 * upload (already done) -> extract -> clean -> chunk -> embed -> store.
 * Updates the document's status at each stage so the admin UI can show
 * progress (uploading / processing / embedding / ready / failed).
 */
export async function processDocument(documentId: string) {
  const { rows } = await pool.query('SELECT * FROM documents WHERE id = $1', [documentId]);
  const doc = rows[0];
  if (!doc) return;

  try {
    await setStatus(documentId, 'processing');
    const raw = await extractText(doc.file_path, doc.file_type);
    const cleaned = cleanText(raw);

    if (!cleaned) {
      throw new Error('No extractable text found in document');
    }

    const chunks = chunkText(cleaned);

    await setStatus(documentId, 'embedding');
    // Remove any previous chunks for this document (e.g. on reprocess).
    await pool.query('DELETE FROM document_chunks WHERE document_id = $1', [documentId]);

    const embeddings = await getEmbeddings(chunks);

    for (let i = 0; i < chunks.length; i++) {
      await pool.query(
        `INSERT INTO document_chunks (document_id, content, embedding, source_type, source_id, category, visibility, metadata)
         VALUES ($1, $2, $3::vector, 'document', $1, $4, $5, $6)`,
        [
          documentId,
          chunks[i],
          toVectorLiteral(embeddings[i]),
          doc.category,
          doc.visibility,
          JSON.stringify({ name: doc.title, chunkIndex: i }),
        ]
      );
    }

    await setStatus(documentId, 'ready');
  } catch (err) {
    logger.error('Document processing failed', { documentId, error: (err as Error).message });
    await pool.query(
      `UPDATE documents SET status = 'failed', error_message = $2, updated_at = now() WHERE id = $1`,
      [documentId, (err as Error).message]
    );
  }
}

async function setStatus(documentId: string, status: string) {
  await pool.query(`UPDATE documents SET status = $2, updated_at = now() WHERE id = $1`, [documentId, status]);
}
