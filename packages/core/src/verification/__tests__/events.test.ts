/**
 * Tests for Verification Event Emitter
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  VerificationEventEmitter,
  createVerificationEvent,
  createErrorEvent,
  createSyncEvent,
  createCacheUpdateEvent,
} from '../events.js';
import {
  VerifierEvent,
  VerificationEventData,
  ErrorEventData,
  SyncEventData,
  CacheUpdateEventData,
} from '../types.js';

describe('VerificationEventEmitter', () => {
  let emitter: VerificationEventEmitter;

  beforeEach(() => {
    emitter = new VerificationEventEmitter();
  });

  describe('constructor', () => {
    it('should create emitter with default non-verbose mode', () => {
      const emitter = new VerificationEventEmitter();
      expect(emitter).toBeDefined();
      expect(emitter.eventNames()).toHaveLength(0);
    });

    it('should create emitter with verbose mode', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const verboseEmitter = new VerificationEventEmitter(true);

      const handler = vi.fn();
      verboseEmitter.on('verification', handler);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('on', () => {
    it('should register handler for event', () => {
      const handler = vi.fn();
      emitter.on('verification', handler);

      expect(emitter.hasListeners('verification')).toBe(true);
      expect(emitter.listenerCount('verification')).toBe(1);
    });

    it('should register multiple handlers for same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      emitter.on('verification', handler1);
      emitter.on('verification', handler2);

      expect(emitter.listenerCount('verification')).toBe(2);
    });

    it('should register handlers for different events', () => {
      emitter.on('verification', vi.fn());
      emitter.on('error', vi.fn());
      emitter.on('sync', vi.fn());

      expect(emitter.eventNames()).toContain('verification');
      expect(emitter.eventNames()).toContain('error');
      expect(emitter.eventNames()).toContain('sync');
    });

    it('should log when verbose mode is enabled', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const verboseEmitter = new VerificationEventEmitter(true);

      verboseEmitter.on('verification', vi.fn());

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Registered handler for event: verification')
      );
      consoleSpy.mockRestore();
    });
  });

  describe('off', () => {
    it('should unregister handler', () => {
      const handler = vi.fn();
      emitter.on('verification', handler);
      expect(emitter.listenerCount('verification')).toBe(1);

      emitter.off('verification', handler);
      expect(emitter.listenerCount('verification')).toBe(0);
    });

    it('should only remove specified handler', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      emitter.on('verification', handler1);
      emitter.on('verification', handler2);

      emitter.off('verification', handler1);

      expect(emitter.listenerCount('verification')).toBe(1);
    });

    it('should handle removing non-existent handler', () => {
      const handler = vi.fn();
      emitter.off('verification', handler); // Should not throw
      expect(emitter.listenerCount('verification')).toBe(0);
    });

    it('should log when verbose mode is enabled', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const verboseEmitter = new VerificationEventEmitter(true);

      const handler = vi.fn();
      verboseEmitter.on('verification', handler);
      consoleSpy.mockClear();

      verboseEmitter.off('verification', handler);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unregistered handler for event: verification')
      );
      consoleSpy.mockRestore();
    });
  });

  describe('emit', () => {
    it('should call all registered handlers', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      emitter.on('verification', handler1);
      emitter.on('verification', handler2);

      await emitter.emit('verification', { test: 'data' });

      expect(handler1).toHaveBeenCalledWith({ test: 'data' });
      expect(handler2).toHaveBeenCalledWith({ test: 'data' });
    });

    it('should do nothing when no handlers registered', async () => {
      await emitter.emit('verification', { test: 'data' });
      // Should not throw
    });

    it('should handle async handlers', async () => {
      const results: number[] = [];
      const handler1 = vi.fn().mockImplementation(async () => {
        await new Promise(r => setTimeout(r, 10));
        results.push(1);
      });
      const handler2 = vi.fn().mockImplementation(async () => {
        await new Promise(r => setTimeout(r, 5));
        results.push(2);
      });

      emitter.on('verification', handler1);
      emitter.on('verification', handler2);

      await emitter.emit('verification', {});

      expect(results).toContain(1);
      expect(results).toContain(2);
    });

    it('should silently handle handler errors', async () => {
      const errorHandler = vi.fn().mockRejectedValue(new Error('Handler error'));
      const successHandler = vi.fn();

      emitter.on('verification', errorHandler);
      emitter.on('verification', successHandler);

      await emitter.emit('verification', {});

      expect(errorHandler).toHaveBeenCalled();
      expect(successHandler).toHaveBeenCalled();
    });

    it('should log when verbose mode is enabled', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const verboseEmitter = new VerificationEventEmitter(true);

      verboseEmitter.on('verification', vi.fn());
      consoleSpy.mockClear();

      await verboseEmitter.emit('verification', {});

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Emitting event: verification')
      );
      consoleSpy.mockRestore();
    });

    it('should log when no handlers exist in verbose mode', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const verboseEmitter = new VerificationEventEmitter(true);

      await verboseEmitter.emit('verification', {});

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No handlers for event: verification')
      );
      consoleSpy.mockRestore();
    });
  });

  describe('emitVerification', () => {
    it('should emit verification event', async () => {
      const handler = vi.fn();
      emitter.on('verification', handler);

      const data: VerificationEventData = {
        result: { isValid: true } as any,
        request: { qrData: {} } as any,
        timestamp: new Date(),
      };

      await emitter.emitVerification(data);

      expect(handler).toHaveBeenCalledWith(data);
    });
  });

  describe('emitError', () => {
    it('should emit error event', async () => {
      const handler = vi.fn();
      emitter.on('error', handler);

      const data: ErrorEventData = {
        error: new Error('Test error'),
        context: 'test-context',
        timestamp: new Date(),
      };

      await emitter.emitError(data);

      expect(handler).toHaveBeenCalledWith(data);
    });
  });

  describe('emitSync', () => {
    it('should emit sync event', async () => {
      const handler = vi.fn();
      emitter.on('sync', handler);

      const data: SyncEventData = {
        result: { success: true } as any,
        timestamp: new Date(),
      };

      await emitter.emitSync(data);

      expect(handler).toHaveBeenCalledWith(data);
    });
  });

  describe('emitCacheUpdate', () => {
    it('should emit cache_update event', async () => {
      const handler = vi.fn();
      emitter.on('cache_update', handler);

      const data: CacheUpdateEventData = {
        itemType: 'credential',
        itemId: 'vc-123',
        operation: 'add',
        timestamp: new Date(),
      };

      await emitter.emitCacheUpdate(data);

      expect(handler).toHaveBeenCalledWith(data);
    });
  });

  describe('removeAllListeners', () => {
    it('should remove all listeners for specific event', () => {
      emitter.on('verification', vi.fn());
      emitter.on('verification', vi.fn());
      emitter.on('error', vi.fn());

      emitter.removeAllListeners('verification');

      expect(emitter.hasListeners('verification')).toBe(false);
      expect(emitter.hasListeners('error')).toBe(true);
    });

    it('should remove all listeners when no event specified', () => {
      emitter.on('verification', vi.fn());
      emitter.on('error', vi.fn());
      emitter.on('sync', vi.fn());

      emitter.removeAllListeners();

      expect(emitter.eventNames()).toHaveLength(0);
    });

    it('should log when verbose mode is enabled', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const verboseEmitter = new VerificationEventEmitter(true);

      verboseEmitter.on('verification', vi.fn());
      consoleSpy.mockClear();

      verboseEmitter.removeAllListeners('verification');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Removed all handlers for event: verification')
      );
      consoleSpy.mockRestore();
    });

    it('should log when removing all listeners in verbose mode', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const verboseEmitter = new VerificationEventEmitter(true);

      verboseEmitter.on('verification', vi.fn());
      consoleSpy.mockClear();

      verboseEmitter.removeAllListeners();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Removed all event handlers')
      );
      consoleSpy.mockRestore();
    });
  });

  describe('listenerCount', () => {
    it('should return 0 for event with no handlers', () => {
      expect(emitter.listenerCount('verification')).toBe(0);
    });

    it('should return correct count', () => {
      emitter.on('verification', vi.fn());
      emitter.on('verification', vi.fn());
      emitter.on('verification', vi.fn());

      expect(emitter.listenerCount('verification')).toBe(3);
    });
  });

  describe('hasListeners', () => {
    it('should return false when no handlers', () => {
      expect(emitter.hasListeners('verification')).toBe(false);
    });

    it('should return true when has handlers', () => {
      emitter.on('verification', vi.fn());
      expect(emitter.hasListeners('verification')).toBe(true);
    });
  });

  describe('eventNames', () => {
    it('should return empty array when no events', () => {
      expect(emitter.eventNames()).toEqual([]);
    });

    it('should return all registered event names', () => {
      emitter.on('verification', vi.fn());
      emitter.on('error', vi.fn());
      emitter.on('cache_update', vi.fn());

      const names = emitter.eventNames();
      expect(names).toContain('verification');
      expect(names).toContain('error');
      expect(names).toContain('cache_update');
    });
  });
});

describe('createVerificationEvent', () => {
  it('should create verification event with all fields', () => {
    const result = { isValid: true };
    const request = { qrData: {} };

    const event = createVerificationEvent(result as any, request as any);

    expect(event.result).toEqual(result);
    expect(event.request).toEqual(request);
    expect(event.timestamp).toBeInstanceOf(Date);
  });

  it('should set timestamp to current time', () => {
    const before = new Date();
    const event = createVerificationEvent({} as any, {} as any);
    const after = new Date();

    expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(event.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});

describe('createErrorEvent', () => {
  it('should create error event with required fields', () => {
    const error = new Error('Test error');
    const context = 'verification';

    const event = createErrorEvent(error, context);

    expect(event.error).toBe(error);
    expect(event.context).toBe(context);
    expect(event.timestamp).toBeInstanceOf(Date);
    expect(event.request).toBeUndefined();
  });

  it('should include optional request when provided', () => {
    const error = new Error('Test error');
    const context = 'verification';
    const request = { qrData: 'test' };

    const event = createErrorEvent(error, context, request as any);

    expect(event.request).toEqual(request);
  });

  it('should set timestamp to current time', () => {
    const before = new Date();
    const event = createErrorEvent(new Error(), 'test');
    const after = new Date();

    expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(event.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});

describe('createSyncEvent', () => {
  it('should create sync event with result', () => {
    const result = { success: true, syncedItems: 10 };

    const event = createSyncEvent(result as any);

    expect(event.result).toEqual(result);
    expect(event.timestamp).toBeInstanceOf(Date);
  });

  it('should set timestamp to current time', () => {
    const before = new Date();
    const event = createSyncEvent({} as any);
    const after = new Date();

    expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(event.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});

describe('createCacheUpdateEvent', () => {
  it('should create cache update event for add operation', () => {
    const event = createCacheUpdateEvent('credential', 'vc-123', 'add');

    expect(event.itemType).toBe('credential');
    expect(event.itemId).toBe('vc-123');
    expect(event.operation).toBe('add');
    expect(event.timestamp).toBeInstanceOf(Date);
  });

  it('should create cache update event for remove operation', () => {
    const event = createCacheUpdateEvent('revocation', 'rev-456', 'remove');

    expect(event.itemType).toBe('revocation');
    expect(event.itemId).toBe('rev-456');
    expect(event.operation).toBe('remove');
  });

  it('should create cache update event for update operation', () => {
    const event = createCacheUpdateEvent('did', 'did:aura:123', 'update');

    expect(event.itemType).toBe('did');
    expect(event.itemId).toBe('did:aura:123');
    expect(event.operation).toBe('update');
  });

  it('should set timestamp to current time', () => {
    const before = new Date();
    const event = createCacheUpdateEvent('credential', 'vc-123', 'add');
    const after = new Date();

    expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(event.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});
