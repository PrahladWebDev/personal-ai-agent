import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import { pool } from '../database/pool';
import { indexKnowledgeItem, deindexKnowledgeItem } from '../rag/indexer';
import { AuthedRequest } from '../middleware/auth';

/** Public view - returns null (not an error) if nothing is set, or if
 * the admin has marked the whole section private. */
export const getPublicPersonalInfo = asyncHandler(async (_req: Request, res: Response) => {
  const { rows } = await pool.query('SELECT * FROM personal_info ORDER BY updated_at DESC LIMIT 1');
  const p = rows[0];
  if (!p || p.visibility !== 'public') return ok(res, null);
  const { visibility, id, ...publicFields } = p;
  return ok(res, publicFields);
});

export const getAdminPersonalInfo = asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const { rows } = await pool.query('SELECT * FROM personal_info ORDER BY updated_at DESC LIMIT 1');
  return ok(res, rows[0] ?? null);
});

export const upsertPersonalInfo = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const b = req.body;
  const { rows: existing } = await pool.query('SELECT id FROM personal_info LIMIT 1');

  const values = [
    b.shortIntroduction || null,
    b.detailedBiography || null,
    b.currentFocus || null,
    b.interests || null,
    b.hobbies || null,
    b.languages || [],
    b.personalGoals || null,
    b.professionalInterests || null,
    b.otherInformation || null,
    b.visibility || 'public',
  ];

  let row;
  if (existing[0]) {
    const { rows } = await pool.query(
      `UPDATE personal_info SET short_introduction=$1, detailed_biography=$2, current_focus=$3,
        interests=$4, hobbies=$5, languages=$6, personal_goals=$7, professional_interests=$8,
        other_information=$9, visibility=$10, updated_at=now()
       WHERE id=$11 RETURNING *`,
      [...values, existing[0].id]
    );
    row = rows[0];
  } else {
    const { rows } = await pool.query(
      `INSERT INTO personal_info (short_introduction, detailed_biography, current_focus, interests,
        hobbies, languages, personal_goals, professional_interests, other_information, visibility)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      values
    );
    row = rows[0];
  }

  if (row.visibility === 'public') {
    const text = [
      row.short_introduction,
      row.detailed_biography,
      row.current_focus ? `Current focus: ${row.current_focus}` : '',
      row.interests ? `Interests: ${row.interests}` : '',
      row.hobbies ? `Hobbies: ${row.hobbies}` : '',
      row.languages?.length ? `Languages spoken: ${row.languages.join(', ')}` : '',
      row.personal_goals ? `Personal goals: ${row.personal_goals}` : '',
      row.professional_interests ? `Professional interests: ${row.professional_interests}` : '',
      row.other_information,
    ].filter(Boolean).join('\n\n');

    await indexKnowledgeItem({
      sourceType: 'personal',
      sourceId: row.id,
      name: 'About Me',
      text,
      visibility: 'public',
    });
  } else {
    await deindexKnowledgeItem('personal', row.id);
  }

  return ok(res, row);
});
