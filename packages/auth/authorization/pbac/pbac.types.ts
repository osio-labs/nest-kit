/**
 * Policy effect — the outcome of evaluating a policy statement.
 */
export type PolicyEffect = 'allow' | 'deny';

/**
 * A single policy statement (akin to AWS IAM).
 *
 * @example
 * ```typescript
 * const policy: PolicyStatement = {
 *   effect: 'deny',
 *   actions: ['document:delete'],
 *   resources: ['org:*'],
 *   condition: { department: { ne: { ref: 'user.department' } } },
 * };
 * ```
 */
export interface PolicyStatement {
  /** Whether this statement allows or denies access */
  effect: PolicyEffect;
  /** Actions this statement applies to (supports wildcard: 'document:*') */
  actions: string[];
  /** Resources this statement applies to (supports wildcard) */
  resources: string[];
  /** Optional conditions that must be satisfied */
  condition?: Record<string, unknown>;
}

/**
 * A complete policy document assigned to a user or role.
 */
export interface PolicyDocument {
  /** Policy identifier */
  id?: string;
  /** Policy name */
  name?: string;
  /** List of statements */
  statements: PolicyStatement[];
}

/**
 * Evaluation context passed to condition functions.
 */
export interface PolicyContext {
  user: Record<string, unknown>;
  resource: Record<string, unknown>;
  environment: Record<string, unknown>;
}
