import { OAuthProviderRegistry } from './oauth-provider-registry';

describe('OAuthProviderRegistry', () => {
  let registry: OAuthProviderRegistry;

  beforeEach(() => {
    registry = new OAuthProviderRegistry();
  });

  it('should register a provider', () => {
    registry.register('google', {
      clientId: 'id',
      clientSecret: 'secret',
      callbackUrl: 'http://localhost/callback',
    });
    expect(registry.has('google')).toBe(true);
  });

  it('should retrieve a provider config', () => {
    const config = {
      clientId: 'id',
      clientSecret: 'secret',
      callbackUrl: 'http://localhost/callback',
    };
    registry.register('google', config);
    expect(registry.get('google')).toEqual(config);
  });

  it('should be case-insensitive', () => {
    registry.register('GitHub', {
      clientId: 'id',
      clientSecret: 'secret',
      callbackUrl: 'http://localhost/callback',
    });
    expect(registry.has('github')).toBe(true);
    expect(registry.get('GITHUB')).toBeDefined();
  });

  it('should return all registered providers', () => {
    registry.register('google', {
      clientId: 'g-id',
      clientSecret: 'g-secret',
      callbackUrl: 'http://localhost/g',
    });
    registry.register('github', {
      clientId: 'gh-id',
      clientSecret: 'gh-secret',
      callbackUrl: 'http://localhost/gh',
    });

    const all = registry.all();
    expect(all.size).toBe(2);
  });
});
