/**
 * Injection token for the API key store provider.
 * Consumers must register a provider implementing `IApiKeyStore` under this token.
 */
export const API_KEY_STORE = 'API_KEY_STORE';

/**
 * Reflect metadata key used by @ApiKeyProtected() decorator.
 */
export const METADATA_API_KEY_PROTECTED = 'auth:apiKeyProtected';
