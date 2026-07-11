import { TeamsProvider } from './messenger-teams.provider.js';

describe('TeamsProvider', () => {
  let provider: TeamsProvider;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    provider = new TeamsProvider();
  });

  it('should send a message card successfully', async () => {
    mockFetch.mockResolvedValue({ ok: true });

    const result = await provider.send({
      webhookUrl: 'https://outlook.office.com/webhook/xxx',
      title: 'Deploy finished',
      text: 'v2.1.0 deployed to production',
    });

    expect(result.success).toBe(true);
    expect(result.providerName).toBe('teams');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[0]).toBe('https://outlook.office.com/webhook/xxx');
    expect(callArgs[1].method).toBe('POST');
    expect(callArgs[1].headers['Content-Type']).toBe('application/json');

    const parsedBody = JSON.parse(callArgs[1].body);
    expect(parsedBody['@type']).toBe('MessageCard');
    expect(parsedBody.title).toBe('Deploy finished');
    expect(parsedBody.text).toBe('v2.1.0 deployed to production');
  });

  it('should handle webhook error response', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 403, statusText: 'Forbidden' });

    const result = await provider.send({
      webhookUrl: 'https://outlook.office.com/webhook/bad',
      text: 'Test',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('403');
    expect(result.error).toContain('Forbidden');
  });

  it('should handle fetch exceptions', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const result = await provider.send({
      webhookUrl: 'https://outlook.office.com/webhook/xxx',
      text: 'Test',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
  });

  it('should include sections and themeColor when provided', async () => {
    mockFetch.mockResolvedValue({ ok: true });

    await provider.send({
      webhookUrl: 'https://outlook.office.com/webhook/xxx',
      text: 'Build failed',
      themeColor: 'FF0000',
      sections: [
        {
          activityTitle: 'CI Pipeline',
          facts: [
            { name: 'Branch', value: 'main' },
            { name: 'Commit', value: 'abc123' },
          ],
        },
      ],
    });

    const parsedBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(parsedBody.themeColor).toBe('FF0000');
    expect(parsedBody.sections[0].activityTitle).toBe('CI Pipeline');
    expect(parsedBody.sections[0].facts).toHaveLength(2);
  });
});
