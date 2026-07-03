const mockSendMail = jest.fn();
const mockCreateTransport = jest.fn();

jest.mock(
  'nodemailer',
  () => ({
    createTransport: mockCreateTransport,
  }),
  { virtual: true },
);

import { GoogleEmailProvider } from './email-google.provider';
import type { EmailSendInput, ProviderResult } from '../notification.types';

describe('GoogleEmailProvider', () => {
  let provider: GoogleEmailProvider;

  const input: EmailSendInput = {
    to: 'user@example.com',
    subject: 'Test',
    body: '<p>Hello</p>',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateTransport.mockReturnValue({ sendMail: mockSendMail });
    provider = new GoogleEmailProvider({
      user: 'test@gmail.com',
      pass: 'app-pass',
      defaultFrom: 'test@gmail.com',
    });
  });

  it('should send successfully and return ProviderResult with success true', async () => {
    mockSendMail.mockResolvedValue({ messageId: '<abc123@mail.gmail.com>' });

    const result: ProviderResult = await provider.send(input);

    expect(result.success).toBe(true);
    expect(result.providerName).toBe('google');
    expect(result.channel).toBe('email');
    expect(result.messageId).toBe('<abc123@mail.gmail.com>');
    expect(mockCreateTransport).toHaveBeenCalledWith({
      service: 'gmail',
      auth: { user: 'test@gmail.com', pass: 'app-pass' },
    });
  });

  it('should return ProviderResult with success false on error', async () => {
    mockSendMail.mockRejectedValue(new Error('SMTP connection failed'));

    const result: ProviderResult = await provider.send(input);

    expect(result.success).toBe(false);
    expect(result.providerName).toBe('google');
    expect(result.channel).toBe('email');
    expect(result.error).toBe('SMTP connection failed');
  });
});
