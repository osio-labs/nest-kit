import { Inject, Injectable } from '@nestjs/common';
import type { ICacheService } from '../../interfaces';
import { CACHE_SERVICE } from '../../auth.constants';
import type { PolicyStatement, PolicyContext, PolicyEffect, PolicyDocument } from './pbac.types';

/**
 * Policy-Based Access Control service.
 *
 * Evaluates user-assigned policies against the current request context.
 * Supports wildcard matching and simple condition evaluation.
 */
@Injectable()
export class PbacService {
  private defaultEffect: PolicyEffect = 'deny';

  constructor(
    @Inject(CACHE_SERVICE)
    private readonly cache: ICacheService,
  ) {}

  /**
   * Configure the default effect when no policy matches.
   */
  setDefaultEffect(effect: PolicyEffect): void {
    this.defaultEffect = effect;
  }

  /**
   * Evaluate a list of policy documents for a given action + resource.
   *
   * Returns `true` if access is granted, `false` otherwise.
   *
   * Evaluation logic (AWS IAM style):
   *   1. An explicit `deny` overrides everything.
   *   2. If any statement matches with `allow`, access is granted.
   *   3. If no statement matches, the default effect applies.
   */
  evaluate(
    policies: PolicyDocument[],
    action: string,
    resource: string,
    context: PolicyContext,
  ): boolean {
    let allowCount = 0;

    for (const doc of policies) {
      for (const stmt of doc.statements) {
        if (!this.matchAction(stmt, action)) continue;
        if (!this.matchResource(stmt, resource)) continue;
        if (stmt.condition && !this.evaluateCondition(stmt.condition, context)) {
          continue;
        }

        if (stmt.effect === 'deny') return false;
        if (stmt.effect === 'allow') allowCount += 1;
      }
    }

    if (allowCount > 0) return true;
    return this.defaultEffect === 'allow';
  }

  /**
   * Fetch policies for a user, using cache when possible.
   */
  async getUserPolicies(userId: string): Promise<PolicyDocument[]> {
    const cacheKey = `pbac:policies:${userId}`;
    const cached = await this.cache.get<PolicyDocument[]>(cacheKey);
    if (cached) return cached;
    return [];
  }

  /**
   * Invalidate cached policies for a user.
   */
  async invalidateUser(userId: string): Promise<void> {
    await this.cache.del(`pbac:policies:${userId}`);
  }

  private matchAction(stmt: PolicyStatement, action: string): boolean {
    return stmt.actions.some((a) => this.wildcardMatch(a, action));
  }

  private matchResource(stmt: PolicyStatement, resource: string): boolean {
    return stmt.resources.some((r) => this.wildcardMatch(r, resource));
  }

  private wildcardMatch(pattern: string, value: string): boolean {
    const regexStr = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp(`^${regexStr}$`).test(value);
  }

  private evaluateCondition(condition: Record<string, unknown>, context: PolicyContext): boolean {
    // Simple condition evaluator — supports { "eq": { "user.department": "engineering" } }
    // Extend this for production use with a proper expression engine.
    try {
      return this.resolveCondition(condition, context);
    } catch {
      return false;
    }
  }

  private resolveCondition(node: unknown, context: PolicyContext): boolean {
    if (typeof node !== 'object' || node === null) return true;

    const obj = node as Record<string, unknown>;

    // Operator keys
    if ('eq' in obj) return this.eq(obj.eq, context);
    if ('ne' in obj) return !this.eq(obj.ne, context);
    if ('and' in obj) {
      const conditions = obj.and as unknown[];
      return conditions.every((c) => this.resolveCondition(c, context));
    }
    if ('or' in obj) {
      const conditions = obj.or as unknown[];
      return conditions.some((c) => this.resolveCondition(c, context));
    }

    return true;
  }

  private eq(mapping: unknown, context: PolicyContext): boolean {
    if (typeof mapping !== 'object' || mapping === null) return false;
    const entries = Object.entries(mapping as Record<string, unknown>);
    if (entries.length !== 1) return false;

    const [key, expected] = entries[0];
    const actual = this.resolveValue(key, context);

    return String(actual) === String(expected);
  }

  private resolveValue(path: string, context: PolicyContext): unknown {
    const parts = path.split('.');
    let current: unknown = context;

    for (const part of parts) {
      if (typeof current !== 'object' || current === null) return undefined;
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }
}
