import { Injectable, Logger } from '@nestjs/common';
import type { WebhookEvent, WebhookEventListener } from './webhook.types.js';

/**
 * In-memory event bus for decoupled webhook emission.
 *
 * Allows producers to emit events and consumers to subscribe
 * without direct coupling between them.
 */
@Injectable()
export class WebhookEventBus {
  private readonly logger = new Logger(WebhookEventBus.name);
  private readonly listeners = new Map<string, Set<WebhookEventListener>>();
  private readonly wildcardListeners = new Set<WebhookEventListener>();

  /**
   * Subscribe to a specific event type.
   */
  on(type: string, listener: WebhookEventListener): this {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
    return this;
  }

  /**
   * Subscribe to all events.
   */
  onAny(listener: WebhookEventListener): this {
    this.wildcardListeners.add(listener);
    return this;
  }

  /**
   * Remove a specific listener for a given event type.
   */
  off(type: string, listener: WebhookEventListener): this {
    const set = this.listeners.get(type);
    if (set) {
      set.delete(listener);
      if (set.size === 0) this.listeners.delete(type);
    }
    return this;
  }

  /**
   * Remove a wildcard listener.
   */
  offAny(listener: WebhookEventListener): this {
    this.wildcardListeners.delete(listener);
    return this;
  }

  /**
   * Emit an event to all matching subscribers.
   */
  async emit(type: string, payload: unknown): Promise<void> {
    const event: WebhookEvent = { type, payload, timestamp: new Date() };

    const promises: Promise<void>[] = [];

    for (const listener of this.wildcardListeners) {
      promises.push(Promise.resolve(listener(event)));
    }

    const typeListeners = this.listeners.get(type);
    if (typeListeners) {
      for (const listener of typeListeners) {
        promises.push(Promise.resolve(listener(event)));
      }
    }

    if (promises.length > 0) {
      await Promise.allSettled(promises).then((results) => {
        for (const result of results) {
          if (result.status === 'rejected') {
            this.logger.error(
              `Webhook event listener failed for "${type}": ${(result.reason as Error).message}`,
            );
          }
        }
      });
    }
  }

  /**
   * Remove all listeners.
   */
  clear(): void {
    this.listeners.clear();
    this.wildcardListeners.clear();
  }

  /**
   * Get the number of registered listeners.
   */
  listenerCount(type?: string): number {
    if (type) {
      return this.listeners.get(type)?.size ?? 0;
    }
    let count = this.wildcardListeners.size;
    for (const set of this.listeners.values()) {
      count += set.size;
    }
    return count;
  }
}
