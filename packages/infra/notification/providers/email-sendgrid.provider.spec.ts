const mockSend = jest.fn();
const mockSetApiKey = jest.fn();

jest.mock(
  '@sendgrid/mail',
  () => ({
    setApiKey: mockSetApiKey,
    send: mockSend,
  }),
  { virtual: true },
);

import { SendGridEmailProvider } from './email-sendgrid.provider.js';
import type { EmailSendInput, ProviderResult } from '../notification.types.js';

describe('SendGridEmailProvider', () => {
  let provider: SendGridEmailProvider;

  const input: EmailSendInput = {
    to: 'user@example.com',
    subject: 'Test',
    body: '<p>Hello</p>',
    text: 'Hello',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new SendGridEmailProvider({
      apiKey: 'test-key',
      defaultFrom: 'noreply@example.com',
    });
  });

  it('should send successfully and return ProviderResult with success true', async () => {
    mockSend.mockResolvedValue([{ headers: { 'x-message-id': 'msg-123', statusCode: 202 } }]);

    const result: ProviderResult = await provider.send(input);

    expect(result.success).toBe(true);
    expect(result.providerName).toBe('sendgrid');
    expect(result.channel).toBe('email');
    expect(result.messageId).toBe('msg-123');
    expect(mockSetApiKey).toHaveBeenCalledWith('test-key');
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('should return ProviderResult with success false on error', async () => {
    mockSend.mockRejectedValue(new Error('SendGrid API error'));

    const result: ProviderResult = await provider.send(input);

    expect(result.success).toBe(false);
    expect(result.providerName).toBe('sendgrid');
    expect(result.channel).toBe('email');
    expect(result.error).toBe('SendGrid API error');
  });
});
