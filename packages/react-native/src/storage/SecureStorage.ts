/** Simple in-memory secure storage abstraction. */
class MemoryStorage {
  private store = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }

  async hasItem(key: string): Promise<boolean> {
    return this.store.has(key);
  }
}

export const SecureStorage = new MemoryStorage();
