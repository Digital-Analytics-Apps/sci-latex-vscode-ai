import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../hash';

describe('Password Hash Utility', () => {
  it('should generate a valid hash string with salt', async () => {
    const password = 'mySecretPassword123';
    const hash = await hashPassword(password);

    expect(hash).toBeDefined();
    expect(hash).toContain(':');
  });

  it('should successfully verify a correct password against its hash', async () => {
    const password = 'mySecretPassword123';
    const hash = await hashPassword(password);

    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it('should reject an incorrect password', async () => {
    const password = 'mySecretPassword123';
    const wrongPassword = 'wrongPassword456';
    const hash = await hashPassword(password);

    const isValid = await verifyPassword(wrongPassword, hash);
    expect(isValid).toBe(false);
  });
});
