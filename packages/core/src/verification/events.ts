/**
 * Event Emitter for Verification Events
 *
 * Provides a simple event system for AuraVerifier to emit verification events,
 * errors, sync updates, and cache changes.
 */

import {
  VerifierEvent,
  EventHandler,
  VerificationEventData,
  ErrorEventData,
  SyncEventData,
  CacheUpdateEventData,
} from './types.js';

/**
 * Type-safe event emitter for verification events
 */
export class VerificationEventEmitter {
  private handlers: Map<VerifierEvent, Set<EventHandler>>;
  private verbose: boolean;

  constructor(verbose = false) {
    this.handlers = new Map();
    this.verbose = verbose;
  }

  /**
   * Register an event handler
   * @param event - Event name to listen for
   * @param handler - Handler function to execute
   */
  on(event: VerifierEvent, handler: EventHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }

    const eventHandlers = this.handlers.get(event)!;
    eventHandlers.add(handler);

    if (this.verbose) {
      console.log(`[VerificationEventEmitter] Registered handler for event: ${event}`);
    }
  }

  /**
   * Unregister an event handler
   * @param event - Event name
   * @param handler - Handler function to remove
   */
  off(event: VerifierEvent, handler: EventHandler): void {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      eventHandlers.delete(handler);

      if (this.verbose) {
        console.log(`[VerificationEventEmitter] Unregistered handler for event: ${event}`);
      }
    }
  }

  /**
   * Emit an event to all registered handlers
   * @param event - Event name
   * @param data - Event data
   */
  async emit(event: VerifierEvent, data: unknown): Promise<void> {
    const eventHandlers = this.handlers.get(event);

    if (!eventHandlers || eventHandlers.size === 0) {
      if (this.verbose) {
        console.log(`[VerificationEventEmitter] No handlers for event: ${event}`);
      }
      return;
    }

    if (this.verbose) {
      console.log(
        `[VerificationEventEmitter] Emitting event: ${event} to ${eventHandlers.size} handlers`
      );
    }

    // Execute all handlers in parallel
    const promises = Array.from(eventHandlers).map(async (handler) => {
      try {
        await handler(data);
      } catch {
        // Silent handler error (security: no info disclosure)
      }
    });

    await Promise.all(promises);
  }

  /**
   * Emit a verification event
   * @param data - Verification event data
   */
  async emitVerification(data: VerificationEventData): Promise<void> {
    await this.emit('verification', data);
  }

  /**
   * Emit an error event
   * @param data - Error event data
   */
  async emitError(data: ErrorEventData): Promise<void> {
    await this.emit('error', data);
  }

  /**
   * Emit a sync event
   * @param data - Sync event data
   */
  async emitSync(data: SyncEventData): Promise<void> {
    await this.emit('sync', data);
  }

  /**
   * Emit a cache update event
   * @param data - Cache update event data
   */
  async emitCacheUpdate(data: CacheUpdateEventData): Promise<void> {
    await this.emit('cache_update', data);
  }

  /**
   * Remove all handlers for a specific event
   * @param event - Event name
   */
  removeAllListeners(event?: VerifierEvent): void {
    if (event) {
      this.handlers.delete(event);
      if (this.verbose) {
        console.log(`[VerificationEventEmitter] Removed all handlers for event: ${event}`);
      }
    } else {
      this.handlers.clear();
      if (this.verbose) {
        console.log(`[VerificationEventEmitter] Removed all event handlers`);
      }
    }
  }

  /**
   * Get number of handlers for an event
   * @param event - Event name
   * @returns Number of registered handlers
   */
  listenerCount(event: VerifierEvent): number {
    const eventHandlers = this.handlers.get(event);
    return eventHandlers ? eventHandlers.size : 0;
  }

  /**
   * Check if event has any handlers
   * @param event - Event name
   * @returns True if event has handlers
   */
  hasListeners(event: VerifierEvent): boolean {
    return this.listenerCount(event) > 0;
  }

  /**
   * Get all registered event names
   * @returns Array of event names with handlers
   */
  eventNames(): VerifierEvent[] {
    return Array.from(this.handlers.keys());
  }
}

/**
 * Create a typed event data object for verification
 */
export function createVerificationEvent(
  result: VerificationEventData['result'],
  request: VerificationEventData['request']
): VerificationEventData {
  return {
    result,
    request,
    timestamp: new Date(),
  };
}

/**
 * Create a typed event data object for errors
 */
export function createErrorEvent(
  error: Error,
  context: string,
  request?: ErrorEventData['request']
): ErrorEventData {
  const event: ErrorEventData = {
    error,
    context,
    timestamp: new Date(),
  };

  if (request !== undefined) {
    event.request = request;
  }

  return event;
}

/**
 * Create a typed event data object for sync
 */
export function createSyncEvent(result: SyncEventData['result']): SyncEventData {
  return {
    result,
    timestamp: new Date(),
  };
}

/**
 * Create a typed event data object for cache updates
 */
export function createCacheUpdateEvent(
  itemType: CacheUpdateEventData['itemType'],
  itemId: string,
  operation: CacheUpdateEventData['operation']
): CacheUpdateEventData {
  return {
    itemType,
    itemId,
    operation,
    timestamp: new Date(),
  };
}
