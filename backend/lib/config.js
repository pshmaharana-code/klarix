import dotenv from 'dotenv';

let config;

function requireValue(name, value) {
  if (!value) throw new Error(`${name} environment variable is required`);
  return value;
}

function validEncryptionKey(value) {
  if (/^[0-9a-fA-F]{64}$/.test(value)) return true;
  return Buffer.from(value, 'base64').length === 32;
}

export function loadConfig() {
  if (config) return config;
  dotenv.config();
  const nodeEnv = process.env.NODE_ENV || 'development';
  const databaseUrl = requireValue('DATABASE_URL', process.env.DATABASE_URL);
  const redisUrl = requireValue('REDIS_URL', process.env.REDIS_URL);
  const jwtSecret = requireValue('JWT_SECRET', process.env.JWT_SECRET);
  const encryptionKey = requireValue('META_ENCRYPTION_KEY', process.env.META_ENCRYPTION_KEY);
  if (!validEncryptionKey(encryptionKey)) throw new Error('META_ENCRYPTION_KEY must be 64 hexadecimal characters or base64 for exactly 32 bytes');
  if (nodeEnv !== 'development' && jwtSecret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters outside development');
  config = { nodeEnv, databaseUrl, redisUrl, jwtSecret, encryptionKey };
  return config;
}

export function redactRedisUrl(redisUrl) {
  try {
    const url = new URL(redisUrl);
    if (url.password) url.password = 'REDACTED';
    if (url.username) url.username = 'REDACTED';
    return url.toString();
  } catch {
    return '<invalid redis url>';
  }
}
