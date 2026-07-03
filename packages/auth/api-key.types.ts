/**
 * Represents an API key record, typically returned by IApiKeyStore.
 */
export interface IApiKey {
  /** Unique API key identifier */
  id: string;

  /** The raw API key value (only present on creation) */
  key?: string;

  /** Client / application name that owns this key */
  clientName: string;

  /** Client identifier used for matching in IApiKeyStore */
  clientId: string;

  /** Roles assigned to this API key (for RBAC integration) */
  roles?: string[];

  /** Direct permissions assigned to this API key */
  permissions?: string[];

  /** Optional expiry timestamp (ms since epoch) */
  expiresAt?: number;

  /** Whether the key is active */
  isActive: boolean;

  /** Arbitrary metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Interface for API key storage and validation.
 *
 * Consumers must provide an implementation under the `API_KEY_STORE`
 * injection token. The store is responsible for looking up a key,
 * checking its validity, and returning the associated metadata.
 */
export interface IApiKeyStore {
  /**
   * Validate and look up an API key.
   *
   * @param key  The raw API key value from the request header
   * @returns The resolved API key record, or `null` if not found / invalid
   */
  validate(key: string): Promise<IApiKey | null>;
}

/**
 * Configuration for the API key authentication guard.
 */
export interface ApiKeyOptions {
  /** HTTP header name (default `'X-API-Key'`) */
  headerName?: string;

  /** Allow API key via query parameter (default false) */
  queryParam?: string;

  /** Whether to attach the full IApiKey to `request.apiKey` (default true) */
  attachApiKey?: boolean;
}
