import { pool } from './pool';
import { hashPassword } from '../auth/authService';

/**
 * CLI helper to create (or update the password of) the single admin user.
 * Usage: npm run create-admin -- admin@example.com "StrongPassword123!"
 */
async function main() {
  const [, , email, password] = process.argv;
  if (!email || !password) {
    console.error('Usage: npm run create-admin -- <email> <password>');
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);

  await pool.query(
    `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'admin')
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [email, passwordHash]
  );

  console.log(`Admin user ready: ${email}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
