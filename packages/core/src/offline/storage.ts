/**
 * Platform-agnostic storage adapters for Aura Verifier SDK
 *
 * Provides storage backends for browser (localStorage), Node.js (file system),
 * and in-memory (testing/fallback) environments.
 */

import { StorageAdapter } from './types.js';
import { sha256HashHex } from '../crypto/hash.js';

/**
 * In-memory storage adapter (for testing and fallback)
 */
export class MemoryStorage implements StorageAdapter {
  private store: Map<string, string> = new Map();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async keys(): Promise<string[]> {
    return Array.from(this.store.keys());
  }

  async size(): Promise<number> {
    let totalSize = 0;
    for (const [key, value] of this.store.entries()) {
      totalSize += key.length + value.length;
    }
    return totalSize;
  }

  /**
   * Get current store size (synchronous)
   */
  getStoreSize(): number {
    return this.store.size;
  }

  /**
   * Export all data (for debugging)
   */
  exportData(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of this.store.entries()) {
      result[key] = value;
    }
    return result;
  }
}

/**
 * Browser localStorage adapter
 */
export class BrowserStorage implements StorageAdapter {
  private prefix: string;

  /**
   * Creates a new BrowserStorage instance
   * @param prefix - Key prefix to namespace storage (default: 'aura_cache_')
   */
  constructor(prefix: string = 'aura_cache_') {
    this.prefix = prefix;

    // Validate localStorage is available
    if (typeof window === 'undefined' || !window.localStorage) {
      throw new Error('localStorage is not available in this environment');
    }
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get(key: string): Promise<string | null> {
    try {
      const value = localStorage.getItem(this.getKey(key));
      return value;
    } catch (error) {
      throw new Error(
        `Failed to get from localStorage: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(this.getKey(key), value);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        throw new Error(
          'localStorage quota exceeded. Consider reducing cache size or clearing old entries.'
        );
      }
      throw new Error(
        `Failed to set in localStorage: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async delete(key: string): Promise<void> {
    try {
      localStorage.removeItem(this.getKey(key));
    } catch (error) {
      throw new Error(
        `Failed to delete from localStorage: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async clear(): Promise<void> {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.prefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      throw new Error(
        `Failed to clear localStorage: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async keys(): Promise<string[]> {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.prefix)) {
          keys.push(key.slice(this.prefix.length));
        }
      }
      return keys;
    } catch (error) {
      throw new Error(
        `Failed to get keys from localStorage: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async size(): Promise<number> {
    try {
      let totalSize = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.prefix)) {
          const value = localStorage.getItem(key);
          if (value) {
            totalSize += key.length + value.length;
          }
        }
      }
      return totalSize;
    } catch (error) {
      throw new Error(
        `Failed to calculate localStorage size: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check available quota (browser-specific)
   */
  async getQuotaInfo(): Promise<{ used: number; quota: number } | null> {
    if (
      typeof navigator !== 'undefined' &&
      'storage' in navigator &&
      'estimate' in navigator.storage
    ) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          used: estimate.usage ?? 0,
          quota: estimate.quota ?? 0,
        };
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Node.js file system storage adapter
 */
export class FileStorage implements StorageAdapter {
  private basePath: string;
  private fs: any;
  private path: any;

  /**
   * Creates a new FileStorage instance
   * @param basePath - Directory path for storing cache files
   */
  constructor(basePath: string = '.aura-cache') {
    this.basePath = basePath;

    // Dynamically import Node.js modules
    try {
      this.fs = require('fs');
      this.path = require('path');
    } catch {
      throw new Error(
        'File system modules not available. FileStorage only works in Node.js environment.'
      );
    }

    // Create base directory if it doesn't exist
    this.ensureDirectory();
  }

  private ensureDirectory(): void {
    if (!this.fs.existsSync(this.basePath)) {
      this.fs.mkdirSync(this.basePath, { recursive: true });
    }
  }

  private getFilePath(key: string): string {
    // Hash the key to create a safe filename
    const hash = sha256HashHex(key);
    return this.path.join(this.basePath, `${hash}.json`);
  }

  async get(key: string): Promise<string | null> {
    try {
      const filePath = this.getFilePath(key);

      if (!this.fs.existsSync(filePath)) {
        return null;
      }

      const data = this.fs.readFileSync(filePath, 'utf8');
      return data;
    } catch (error) {
      if ((error as any)?.code === 'ENOENT') {
        return null;
      }
      throw new Error(
        `Failed to read from file storage: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      this.ensureDirectory();
      const filePath = this.getFilePath(key);
      this.fs.writeFileSync(filePath, value, 'utf8');
    } catch (error) {
      throw new Error(
        `Failed to write to file storage: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const filePath = this.getFilePath(key);
      if (this.fs.existsSync(filePath)) {
        this.fs.unlinkSync(filePath);
      }
    } catch (error) {
      throw new Error(
        `Failed to delete from file storage: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async clear(): Promise<void> {
    try {
      if (!this.fs.existsSync(this.basePath)) {
        return;
      }

      const files = this.fs.readdirSync(this.basePath);
      for (const file of files) {
        if (file.endsWith('.json')) {
          this.fs.unlinkSync(this.path.join(this.basePath, file));
        }
      }
    } catch (error) {
      throw new Error(
        `Failed to clear file storage: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async keys(): Promise<string[]> {
    try {
      if (!this.fs.existsSync(this.basePath)) {
        return [];
      }

      const files = this.fs.readdirSync(this.basePath);
      const keys: string[] = [];

      // We can't reverse the hash, so we need to read each file to get the original key
      // This is a limitation, but acceptable for cache use case
      for (const file of files) {
        if (file.endsWith('.json')) {
          keys.push(file.replace('.json', ''));
        }
      }

      return keys;
    } catch (error) {
      throw new Error(
        `Failed to get keys from file storage: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async size(): Promise<number> {
    try {
      if (!this.fs.existsSync(this.basePath)) {
        return 0;
      }

      const files = this.fs.readdirSync(this.basePath);
      let totalSize = 0;

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = this.path.join(this.basePath, file);
          const stats = this.fs.statSync(filePath);
          totalSize += stats.size;
        }
      }

      return totalSize;
    } catch (error) {
      throw new Error(
        `Failed to calculate file storage size: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get base path
   */
  getBasePath(): string {
    return this.basePath;
  }
}

/**
 * Auto-detect and create appropriate storage adapter
 */
export function createStorageAdapter(
  type?: 'memory' | 'browser' | 'file',
  options?: { prefix?: string; basePath?: string }
): StorageAdapter {
  // If type is specified, use it
  if (type === 'memory') {
    return new MemoryStorage();
  }

  if (type === 'browser') {
    return new BrowserStorage(options?.prefix);
  }

  if (type === 'file') {
    return new FileStorage(options?.basePath);
  }

  // Auto-detect environment
  if (typeof window !== 'undefined' && window.localStorage) {
    // Browser environment
    return new BrowserStorage(options?.prefix);
  }

  if (typeof process !== 'undefined' && process.versions?.node) {
    // Node.js environment
    try {
      return new FileStorage(options?.basePath);
    } catch {
      // Fallback to memory if file system is not available
      return new MemoryStorage();
    }
  }

  // Default fallback
  return new MemoryStorage();
}
