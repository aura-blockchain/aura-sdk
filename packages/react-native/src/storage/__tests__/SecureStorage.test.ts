import { describe, it, expect, beforeEach } from 'vitest';
import { SecureStorage } from '../SecureStorage';

describe('SecureStorage (in-memory)', () => {
  const key = 'test-key';

  beforeEach(async () => {
    await SecureStorage.removeItem(key);
  });

  it('stores and retrieves values', async () => {
    await SecureStorage.setItem(key, 'value');

    const exists = await SecureStorage.hasItem(key);
    expect(exists).toBe(true);

    const stored = await SecureStorage.getItem(key);
    expect(stored).toBe('value');
  });

  it('returns null for missing keys', async () => {
    const stored = await SecureStorage.getItem(key);
    expect(stored).toBeNull();
  });

  it('removes keys', async () => {
    await SecureStorage.setItem(key, 'value');
    await SecureStorage.removeItem(key);

    const exists = await SecureStorage.hasItem(key);
    expect(exists).toBe(false);
  });
});
