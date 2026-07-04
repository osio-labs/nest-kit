import { Injectable, Logger } from '@nestjs/common';
import type { CircuitBreakerState, CircuitBreakerOptions } from './webhook.types';

interface EndpointState {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number;
  cooldownUntil: number;
}

/**
 * Circuit breaker implementation to stop hammering dead URLs after repeated failures.
 *
 * Tracks failures per endpoint URL and opens the circuit when the failure
 * threshold is reached. After a cooldown period, transitions to half-open
 * to probe if the endpoint has recovered.
 */
@Injectable()
export class WebhookCircuitBreaker {
  private readonly logger = new Logger(WebhookCircuitBreaker.name);
  private readonly endpoints = new Map<string, EndpointState>();

  constructor(private readonly options: CircuitBreakerOptions = {}) {
    this.options = {
      failureThreshold: options.failureThreshold ?? 5,
      cooldownMs: options.cooldownMs ?? 30000,
      halfOpenSuccessThreshold: options.halfOpenSuccessThreshold ?? 3,
      probeTimeoutMs: options.probeTimeoutMs ?? 5000,
    };
  }

  /**
   * Check if a request to the given endpoint is allowed.
   */
  isAllowed(url: string): boolean {
    const state = this.getState(url);

    if (state.state === 'closed') return true;

    if (state.state === 'open') {
      if (Date.now() >= state.cooldownUntil) {
        this.transitionTo(url, 'half_open');
        return true;
      }
      return false;
    }

    return true;
  }

  /**
   * Record a successful delivery.
   */
  onSuccess(url: string): void {
    const state = this.getState(url);

    if (state.state === 'half_open') {
      state.successCount++;
      if (state.successCount >= (this.options.halfOpenSuccessThreshold ?? 3)) {
        this.transitionTo(url, 'closed');
      }
    }

    if (state.state === 'closed') {
      state.failureCount = 0;
    }
  }

  /**
   * Record a delivery failure.
   */
  onFailure(url: string): void {
    const state = this.getState(url);
    state.failureCount++;
    state.lastFailureTime = Date.now();

    if (state.failureCount >= (this.options.failureThreshold ?? 5)) {
      this.transitionTo(url, 'open');
    }
  }

  /**
   * Get the current state for an endpoint.
   */
  getState(url: string): EndpointState {
    let state = this.endpoints.get(url);
    if (!state) {
      state = {
        state: 'closed',
        failureCount: 0,
        successCount: 0,
        lastFailureTime: 0,
        cooldownUntil: 0,
      };
      this.endpoints.set(url, state);
    }
    return state;
  }

  /**
   * Get the current circuit state name for an endpoint.
   */
  getCircuitState(url: string): CircuitBreakerState {
    return this.getState(url).state;
  }

  /**
   * Reset the circuit breaker for a given URL.
   */
  reset(url: string): void {
    this.endpoints.delete(url);
  }

  /**
   * Reset all circuits.
   */
  resetAll(): void {
    this.endpoints.clear();
  }

  private transitionTo(url: string, newState: CircuitBreakerState): void {
    const state = this.endpoints.get(url);
    if (!state) return;

    state.state = newState;

    if (newState === 'open') {
      state.cooldownUntil = Date.now() + (this.options.cooldownMs ?? 30000);
      this.logger.warn(
        `Circuit opened for "${url}" — will retry after ${(this.options.cooldownMs ?? 30000) / 1000}s`,
      );
    }

    if (newState === 'closed') {
      state.failureCount = 0;
      state.successCount = 0;
      this.logger.log(`Circuit closed for "${url}" — endpoint is healthy again`);
    }

    if (newState === 'half_open') {
      state.successCount = 0;
      this.logger.log(`Circuit half-open for "${url}" — probing endpoint`);
    }
  }
}
