import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, fail } from '../utils/apiResponse';
import { pool } from '../database/pool';
import { indexKnowledgeItem, deindexKnowledgeItem } from '../rag/indexer';
import { AuthedRequest } from '../middleware/auth';

export const listCertifications = asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = Boolean((req as AuthedRequest).user);
  const { rows } = await pool.query(
    `SELECT * FROM certifications ${isAdmin ? '' : "WHERE visibility = 'public'"}
     ORDER BY display_order ASC, issue_date DESC NULLS LAST`
  );
  return ok(res, rows);
});

export const createCertification = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const b = req.body;
  if (!b.name) return fail(res, 'Certification name is required', 'MISSING_FIELD', 422);
  if (!b.issuingOrganization) return fail(res, 'Issuing organization is required', 'MISSING_FIELD', 422);

  const { rows } = await pool.query(
    `INSERT INTO certifications
      (name, issuing_organization, description, issue_date, expiration_date, credential_id,
       credential_url, document_id, visibility, display_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [b.name, b.issuingOrganization, b.description || null, b.issueDate || null, b.expirationDate || null,
      b.credentialId || null, b.credentialUrl || null, b.documentId || null, b.visibility || 'public',
      b.displayOrder || 0]
  );
  await indexEntity(rows[0]);
  return ok(res, rows[0], 201);
});

export const updateCertification = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  const b = req.body;

  const { rows } = await pool.query(
    `UPDATE certifications SET name=$1, issuing_organization=$2, description=$3, issue_date=$4,
      expiration_date=$5, credential_id=$6, credential_url=$7, document_id=$8, visibility=$9,
      display_order=$10, updated_at=now()
     WHERE id=$11 RETURNING *`,
    [b.name, b.issuingOrganization, b.description || null, b.issueDate || null, b.expirationDate || null,
      b.credentialId || null, b.credentialUrl || null, b.documentId || null, b.visibility || 'public',
      b.displayOrder || 0, id]
  );
  if (!rows[0]) return fail(res, 'Certification not found', 'NOT_FOUND', 404);

  await indexEntity(rows[0]);
  return ok(res, rows[0]);
});

export const deleteCertification = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  await pool.query('DELETE FROM certifications WHERE id = $1', [id]);
  await deindexKnowledgeItem('certification', id);
  return ok(res, { deleted: true });
});

async function indexEntity(c: any) {
  const text = [
    `Certification: ${c.name}`,
    `Issued by: ${c.issuing_organization}`,
    c.issue_date ? `Issue date: ${c.issue_date}` : '',
    c.expiration_date ? `Expiration date: ${c.expiration_date}` : '',
    c.credential_id ? `Credential ID: ${c.credential_id}` : '',
    c.description,
    c.credential_url ? `Credential link: ${c.credential_url}` : '',
  ].filter(Boolean).join('\n');

  await indexKnowledgeItem({
    sourceType: 'certification',
    sourceId: c.id,
    name: c.name,
    text,
    visibility: c.visibility,
  });
}
