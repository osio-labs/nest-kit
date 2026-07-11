import type { IApiKeyStore, IApiKey } from './api-key.types.js';
import { API_KEY_STORE } from './api-key.constants.js';
import { ApiKeyGuard } from './api-key.guard.js';
import { METADATA_API_KEY_PROTECTED } from './api-key.constants.js';

const mockStore: jest.Mocked<IApiKeyStore> = {
  validate: jest.fn(),
};

const mockReflector = {
  getAllAndOverride: jest.fn(),
};

const mockRequest = (headers: Record<string, string> = {}, query: Record<string, string> = {}) => ({
  headers: { ...headers },
  query,
});

function createGuard() {
  return new ApiKeyGuard(mockStore, mockReflector as never);
}

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = createGuard();
    mockReflector.getAllAndOverride.mockReturnValue(undefined);
  });

  describe('extractKey', () => {
    it('should extract key from X-API-Key header', async () => {
      mockStore.validate.mockResolvedValue({
        id: 'key-1',
        clientName: 'test-app',
        clientId: 'client-1',
        isActive: true,
      } as IApiKey);

      const req = mockRequest({ 'x-api-key': 'sk-test123' });
      const ctx = {
        switchToHttp: () => ({ getRequest: () => req }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as never;

      await guard.canActivate(ctx);
      expect(mockStore.validate).toHaveBeenCalledWith('sk-test123');
    });

    it('should extract key from custom header name', async () => {
      mockReflector.getAllAndOverride.mockReturnValue({ headerName: 'X-Custom-Key' });
      mockStore.validate.mockResolvedValue({
        id: 'key-1',
        clientName: 'test-app',
        clientId: 'client-1',
        isActive: true,
      } as IApiKey);

      const req = mockRequest({ 'x-custom-key': 'sk-xxx' });
      const ctx = {
        switchToHttp: () => ({ getRequest: () => req }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as never;

      await guard.canActivate(ctx);
      expect(mockStore.validate).toHaveBeenCalledWith('sk-xxx');
    });

    it('should extract key from query param', async () => {
      mockReflector.getAllAndOverride.mockReturnValue({ queryParam: 'api_key' });
      mockStore.validate.mockResolvedValue({
        id: 'key-1',
        clientName: 'test-app',
        clientId: 'client-1',
        isActive: true,
      } as IApiKey);

      const req = mockRequest({}, { api_key: 'sk-query' });
      const ctx = {
        switchToHttp: () => ({ getRequest: () => req }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as never;

      await guard.canActivate(ctx);
      expect(mockStore.validate).toHaveBeenCalledWith('sk-query');
    });
  });

  describe('canActivate', () => {
    it('should return true with valid API key', async () => {
      mockStore.validate.mockResolvedValue({
        id: 'key-1',
        clientName: 'my-app',
        clientId: 'client-1',
        roles: ['admin'],
        permissions: ['read:all'],
        isActive: true,
      } as IApiKey);

      const req = mockRequest({ 'x-api-key': 'sk-valid' });
      const ctx = {
        switchToHttp: () => ({ getRequest: () => req }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as never;

      const result = await guard.canActivate(ctx);
      expect(result).toBe(true);
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe('client-1');
      expect(req.user.roles).toEqual(['admin']);
      expect(req.user.permissions).toEqual(['read:all']);
    });

    it('should throw on missing key', async () => {
      const req = mockRequest({});
      const ctx = {
        switchToHttp: () => ({ getRequest: () => req }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as never;

      await expect(guard.canActivate(ctx)).rejects.toThrow('Missing API key');
    });

    it('should throw on invalid key', async () => {
      mockStore.validate.mockResolvedValue(null);

      const req = mockRequest({ 'x-api-key': 'sk-invalid' });
      const ctx = {
        switchToHttp: () => ({ getRequest: () => req }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as never;

      await expect(guard.canActivate(ctx)).rejects.toThrow('Invalid API key');
    });

    it('should throw on inactive key', async () => {
      mockStore.validate.mockResolvedValue({
        id: 'key-1',
        clientName: 'my-app',
        clientId: 'client-1',
        isActive: false,
      } as IApiKey);

      const req = mockRequest({ 'x-api-key': 'sk-inactive' });
      const ctx = {
        switchToHttp: () => ({ getRequest: () => req }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as never;

      await expect(guard.canActivate(ctx)).rejects.toThrow('API key is inactive');
    });

    it('should throw on expired key', async () => {
      mockStore.validate.mockResolvedValue({
        id: 'key-1',
        clientName: 'my-app',
        clientId: 'client-1',
        isActive: true,
        expiresAt: Date.now() - 1000,
      } as IApiKey);

      const req = mockRequest({ 'x-api-key': 'sk-expired' });
      const ctx = {
        switchToHttp: () => ({ getRequest: () => req }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as never;

      await expect(guard.canActivate(ctx)).rejects.toThrow('API key has expired');
    });

    it('should attach apiKey to request by default', async () => {
      const apiKey: IApiKey = {
        id: 'key-1',
        clientName: 'test',
        clientId: 'client-1',
        isActive: true,
      };
      mockStore.validate.mockResolvedValue(apiKey);

      const req = mockRequest({ 'x-api-key': 'sk-test' });
      const ctx = {
        switchToHttp: () => ({ getRequest: () => req }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as never;

      await guard.canActivate(ctx);
      expect(req.apiKey).toBe(apiKey);
    });
  });
});
