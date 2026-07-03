import { TelegramProvider } from './messenger-telegram.provider';

const mockSendMessage = jest.fn();
jest.mock('node-telegram-bot-api', () => jest.fn(() => ({ sendMessage: mockSendMessage })), {
  virtual: true,
});

describe('TelegramProvider', () => {
  let provider: TelegramProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new TelegramProvider({ botToken: 'test-bot-token' });
  });

  it('should send a text message successfully', async () => {
    mockSendMessage.mockResolvedValue({ message_id: 42 });

    const result = await provider.send({
      chatId: '@testchat',
      text: 'Hello from Telegram',
    });

    expect(result.success).toBe(true);
    expect(result.providerName).toBe('telegram');
    expect(result.channel).toBe('telegram');
    expect(result.messageId).toBe('42');
    expect(mockSendMessage).toHaveBeenCalledWith('@testchat', 'Hello from Telegram', {
      parse_mode: undefined,
      reply_markup: undefined,
    });
  });

  it('should send with parse mode and buttons', async () => {
    mockSendMessage.mockResolvedValue({ message_id: 99 });

    const result = await provider.send({
      chatId: 12345,
      text: 'Click below',
      parseMode: 'HTML',
      buttons: [[{ text: 'Visit', url: 'https://example.com' }]],
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBe('99');
    expect(mockSendMessage).toHaveBeenCalledWith(12345, 'Click below', {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Visit', url: 'https://example.com', callback_data: undefined }],
        ],
      },
    });
  });

  it('should return failure on error', async () => {
    mockSendMessage.mockRejectedValue(new Error('Telegram API error'));

    const result = await provider.send({ chatId: '@test', text: 'Hi' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Telegram API error');
  });
});
