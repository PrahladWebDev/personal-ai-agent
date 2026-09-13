import winston from 'winston';

const REDACT_KEYS = ['password', 'password_hash', 'api_key', 'apikey', 'token', 'jwt_secret', 'authorization'];

function redact(info: Record<string, unknown>) {
  const clone: Record<string, unknown> = { ...info };
  for (const key of Object.keys(clone)) {
    if (REDACT_KEYS.some((k) => key.toLowerCase().includes(k))) {
      clone[key] = '[REDACTED]';
    }
  }
  return clone;
}

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format((info) => redact(info) as any)(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});
