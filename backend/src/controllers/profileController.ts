import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import { pool } from '../database/pool';
import { indexKnowledgeItem } from '../rag/indexer';
import { AuthedRequest } from '../middleware/auth';

/** Public profile view - strips fields whose visibility is 'private'. */
export const getPublicProfile = asyncHandler(async (_req: Request, res: Response) => {
  const { rows } = await pool.query('SELECT * FROM profile ORDER BY updated_at DESC LIMIT 1');
  const p = rows[0];
  if (!p) return ok(res, null);

  return ok(res, {
    name: p.name,
    title: p.title,
    shortBio: p.short_bio,
    longBio: p.long_bio,
    location: p.location_visibility === 'public' ? p.location : undefined,
    email: p.email_visibility === 'public' ? p.email : undefined,
    currentFocus: p.current_focus,
    professionalInterests: p.professional_interests,
  });
});

export const getAdminProfile = asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const { rows } = await pool.query('SELECT * FROM profile ORDER BY updated_at DESC LIMIT 1');
  return ok(res, rows[0] ?? null);
});

export const upsertProfile = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const {
    name, title, shortBio, longBio, location, locationVisibility,
    email, emailVisibility, currentFocus, professionalInterests,
  } = req.body;

  const { rows: existing } = await pool.query('SELECT id FROM profile LIMIT 1');

  let row;
  if (existing[0]) {
    const { rows } = await pool.query(
      `UPDATE profile SET name=$1, title=$2, short_bio=$3, long_bio=$4, location=$5,
        location_visibility=$6, email=$7, email_visibility=$8, current_focus=$9,
        professional_interests=$10, updated_at=now()
       WHERE id=$11 RETURNING *`,
      [name, title, shortBio, longBio, location, locationVisibility, email, emailVisibility,
        currentFocus, professionalInterests, existing[0].id]
    );
    row = rows[0];
  } else {
    const { rows } = await pool.query(
      `INSERT INTO profile (name, title, short_bio, long_bio, location, location_visibility,
        email, email_visibility, current_focus, professional_interests)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [name, title, shortBio, longBio, location, locationVisibility, email, emailVisibility,
        currentFocus, professionalInterests]
    );
    row = rows[0];
  }

  // Profile is always indexed as public knowledge (bio/title/focus are
  // meant to be surfaced by the agent); private fields like raw email/
  // location are deliberately excluded from the indexed text below.
  const text = [
    `${row.name} - ${row.title}`,
    row.short_bio,
    row.long_bio,
    row.current_focus ? `Current focus: ${row.current_focus}` : '',
    row.professional_interests ? `Professional interests: ${row.professional_interests}` : '',
  ].filter(Boolean).join('\n\n');

  await indexKnowledgeItem({
    sourceType: 'profile',
    sourceId: row.id,
    name: row.name,
    text,
    visibility: 'public',
  }).catch(() => undefined);

  return ok(res, row);
});
