/**
 * Seeds placeholder data so the app is immediately explorable after
 * `docker compose up`. Every value is a clearly-marked placeholder -
 * replace it via the admin dashboard at /admin with your real
 * information. Safe to re-run.
 */
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  await pool.query(`
    INSERT INTO profile (name, title, short_bio, long_bio, current_focus, professional_interests)
    SELECT 'YOUR_NAME', 'YOUR_TITLE (e.g. Full-Stack Developer)',
      'YOUR_SHORT_BIO', 'YOUR_LONG_BIO', 'YOUR_CURRENT_FOCUS', 'YOUR_PROFESSIONAL_INTERESTS'
    WHERE NOT EXISTS (SELECT 1 FROM profile)
  `);

  await pool.query(`
    INSERT INTO social_links (platform, url, visibility, display_order)
    SELECT * FROM (VALUES
      ('GitHub', 'https://github.com/YOUR_GITHUB', 'public', 1),
      ('LinkedIn', 'https://linkedin.com/in/YOUR_LINKEDIN', 'public', 2),
      ('Email', 'mailto:YOUR_EMAIL', 'public', 3)
    ) AS v(platform, url, visibility, display_order)
    WHERE NOT EXISTS (SELECT 1 FROM social_links)
  `);

  console.log('Seed complete. Replace placeholder values from /admin.');
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
