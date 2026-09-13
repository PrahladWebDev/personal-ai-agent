import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, fail } from '../utils/apiResponse';
import { pool } from '../database/pool';
import { processDocument } from '../documents/processDocument';
import { deindexKnowledgeItem } from '../rag/indexer';
import { AuthedRequest } from '../middleware/auth';

const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
  'text/markdown': 'md',
};

export const listDocuments = asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const { rows } = await pool.query('SELECT * FROM documents ORDER BY created_at DESC');
  return ok(res, rows);
});

export const uploadDocument = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) return fail(res, 'No file uploaded', 'NO_FILE', 422);

  const fileType = ALLOWED_TYPES[file.mimetype] || guessFromExt(file.originalname);
  if (!fileType) return fail(res, 'Unsupported file type', 'UNSUPPORTED_FILE_TYPE', 422);

  const { title, category, visibility } = req.body;

  const { rows } = await pool.query(
    `INSERT INTO documents (title, file_name, file_type, file_path, category, status, visibility)
     VALUES ($1,$2,$3,$4,$5,'uploading',$6) RETURNING *`,
    [title || file.originalname, file.originalname, fileType, file.path, category || 'other', visibility || 'private']
  );
  const doc = rows[0];

  // Fire and forget: processing runs async so the upload response is fast.
  // Status transitions (processing -> embedding -> ready/failed) are
  // polled by the admin UI.
  processDocument(doc.id).catch(() => undefined);

  return ok(res, doc, 201);
});

function guessFromExt(filename: string): string | null {
  const ext = path.extname(filename).replace('.', '').toLowerCase();
  return ['pdf', 'docx', 'txt', 'md'].includes(ext) ? ext : null;
}

export const reprocessDocument = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  await pool.query(`UPDATE documents SET status = 'uploading', error_message = NULL WHERE id = $1`, [id]);
  processDocument(id).catch(() => undefined);
  return ok(res, { queued: true });
});

export const deleteDocument = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  const { rows } = await pool.query('SELECT file_path FROM documents WHERE id = $1', [id]);

  await pool.query('DELETE FROM documents WHERE id = $1', [id]);
  await deindexKnowledgeItem('document', id);

  if (rows[0]?.file_path) {
    await fs.unlink(rows[0].file_path).catch(() => undefined);
  }
  return ok(res, { deleted: true });
});
