import crypto from 'crypto';
import { loadConfig } from './config.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

function getKey() {
  const keyBase = loadConfig().encryptionKey;
  if (/^[0-9a-fA-F]{64}$/.test(keyBase)) {
    return Buffer.from(keyBase, 'hex');
  }
  return Buffer.from(keyBase, 'base64');
}

function encrypt(text) {
  if (!text) return text;
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag().toString('base64');
  
  return `v1.${iv.toString('base64')}.${authTag}.${encrypted}`;
}

function decrypt(encryptedText) {
  if (!encryptedText) return encryptedText;
  
  try {
    const parts = encryptedText.split('.');
    if (parts.length !== 4 || parts[0] !== 'v1') {
      throw new Error('Invalid encrypted text format');
    }
    
    const [, ivBase64, authTagBase64, ciphertextBase64] = parts;
    const key = getKey();
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(ciphertextBase64, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('[Crypto] Decryption failed:', error.message);
    return null;
  }
}

export { encrypt, decrypt };
