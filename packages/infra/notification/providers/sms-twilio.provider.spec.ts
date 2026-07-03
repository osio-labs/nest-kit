import { TwilioSmsProvider } from './sms-twilio.provider';

const mockCreate = jest.fn();
jest.mock('twilio', () => jest.fn(() => ({ messages: { create: mockCreate } })), { virtual: true });

describe('TwilioSmsProvider', () => {
  let provider: TwilioSmsProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new TwilioSmsProvider({
      accountSid: 'test-sid',
      authToken: 'test-token',
      from: '+15551234567',
    });
  });

  it('should send an SMS successfully', async () => {
    mockCreate.mockResolvedValue({ sid: 'SM123' });

    const result = await provider.send({ to: '+15559876543', body: 'Hello from Twilio' });

    expect(result.success).toBe(true);
    expect(result.providerName).toBe('twilio');
    expect(result.channel).toBe('sms');
    expect(result.messageId).toBe('SM123');
    expect(mockCreate).toHaveBeenCalledWith({
      to: '+15559876543',
      body: 'Hello from Twilio',
      from: '+15551234567',
    });
  });

  it('should return failure on error', async () => {
    mockCreate.mockRejectedValue(new Error('Twilio API error'));

    const result = await provider.send({ to: '+15559876543', body: 'Hello' });

    expect(result.success).toBe(false);
    expect(result.providerName).toBe('twilio');
    expect(result.error).toBe('Twilio API error');
  });
});
