import { GoogleChatProvider } from './messenger-google-chat.provider';

describe('GoogleChatProvider', () => {
  let provider: GoogleChatProvider;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    provider = new GoogleChatProvider();
  });

  it('should send a text message successfully', async () => {
    mockFetch.mockResolvedValue({ ok: true });

    const result = await provider.send({
      webhookUrl: 'https://chat.googleapis.com/v1/spaces/xxx/messages',
      text: 'Hello from nest-kit!',
    });

    expect(result.success).toBe(true);
    expect(result.providerName).toBe('googlechat');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const args = mockFetch.mock.calls[0];
    expect(args[0]).toBe('https://chat.googleapis.com/v1/spaces/xxx/messages');
    const parsed = JSON.parse(args[1].body);
    expect(parsed.text).toBe('Hello from nest-kit!');
  });

  it('should include threadKey when provided', async () => {
    mockFetch.mockResolvedValue({ ok: true });

    await provider.send({
      webhookUrl: 'https://chat.googleapis.com/v1/spaces/xxx/messages',
      text: 'Reply',
      threadKey: 'thread-1',
    });

    const parsed = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(parsed.thread.threadKey).toBe('thread-1');
  });

  it('should send cardsV2 when cards provided', async () => {
    mockFetch.mockResolvedValue({ ok: true });

    await provider.send({
      webhookUrl: 'https://chat.googleapis.com/v1/spaces/xxx/messages',
      text: 'Check this',
      cards: [
        {
          header: { title: 'Alert' },
          sections: [
            {
              widgets: [{ textParagraph: { text: 'Something happened' } }],
            },
          ],
        },
      ],
    });

    const parsed = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(parsed.cardsV2).toHaveLength(1);
    expect(parsed.cardsV2[0].cardId).toBe('card-0');
    expect(parsed.cardsV2[0].card.header.title).toBe('Alert');
  });

  it('should handle error response', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 403, statusText: 'Forbidden' });

    const result = await provider.send({
      webhookUrl: 'https://chat.googleapis.com/v1/spaces/xxx/messages',
      text: 'Test',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('403');
  });

  it('should handle fetch exceptions', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const result = await provider.send({
      webhookUrl: 'https://chat.googleapis.com/v1/spaces/xxx/messages',
      text: 'Test',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
  });
});
