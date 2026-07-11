import type { OAuthProviderConfig } from '../../auth.options.js';

/**
 * Registry of OAuth provider configurations.
 * Populated at runtime from AuthModuleOptions.oauth.
 */
export class OAuthProviderRegistry {
  private providers = new Map<string, OAuthProviderConfig>();

  register(provider: string, config: OAuthProviderConfig): void {
    this.providers.set(provider.toLowerCase(), config);
  }

  get(provider: string): OAuthProviderConfig | undefined {
    return this.providers.get(provider.toLowerCase());
  }

  has(provider: string): boolean {
    return this.providers.has(provider.toLowerCase());
  }

  all(): Map<string, OAuthProviderConfig> {
    return new Map(this.providers);
  }
}
