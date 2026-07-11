import { FirebasePushProvider } from './push-firebase.provider.js';

const mockSendEachForMulticast = jest.fn();
const mockMessaging = jest.fn(() => ({ sendEachForMulticast: mockSendEachForMulticast }));
const mockCert = jest.fn((cred) => cred);
const mockApp = jest.fn();

jest.mock(
  'firebase-admin',
  () => ({
    apps: [],
    initializeApp: mockApp,
    credential: { cert: mockCert },
    messaging: mockMessaging,
  }),
  { virtual: true },
);

describe('FirebasePushProvider', () => {
  let provider: FirebasePushProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new FirebasePushProvider({
      serviceAccount: { projectId: 'test-project' },
    });
  });

  it('should send a push notification via multicast', async () => {
    mockSendEachForMulticast.mockResolvedValue({
      successCount: 2,
      failureCount: 0,
      responses: [{ messageId: 'msg-1' }, { messageId: 'msg-2' }],
    });

    const result = await provider.send({
      tokens: ['token-1', 'token-2'],
      title: 'Test Title',
      body: 'Test Body',
      data: { key: 'value' },
    });

    expect(result.success).toBe(true);
    expect(result.providerName).toBe('firebase');
    expect(result.channel).toBe('push');
    expect(result.messageId).toBe('msg-1');
    expect(result.metadata).toEqual({ successCount: 2, failureCount: 0 });
    expect(mockSendEachForMulticast).toHaveBeenCalledTimes(1);
  });

  it('should return failure on error', async () => {
    mockSendEachForMulticast.mockRejectedValue(new Error('FCM error'));

    const result = await provider.send({
      tokens: ['token-1'],
      title: 'Test',
      body: 'Body',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('FCM error');
  });
});
