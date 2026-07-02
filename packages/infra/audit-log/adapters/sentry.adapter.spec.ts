const mockAddBreadcrumb = jest.fn();

jest.mock(
  '@sentry/node',
  () => ({
    addBreadcrumb: mockAddBreadcrumb,
  }),
  { virtual: true },
);

import { SentryAdapter } from './sentry.adapter';

describe('SentryAdapter', () => {
  let adapter: SentryAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new SentryAdapter({ dsn: 'https://key@o0.ingest.sentry.io/0' });
  });

  it('should add a breadcrumb on save', async () => {
    const result = await adapter.save({
      action: 'user.login',
      resource: 'user',
      resourceId: 'u1',
      userId: 'usr-1',
    });

    expect(result.id).toBeDefined();
    expect(result.action).toBe('user.login');
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(mockAddBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'audit',
        message: 'user.login on user',
        data: expect.objectContaining({
          resource: 'user',
          userId: 'usr-1',
        }),
      }),
    );
  });

  it('should use custom level', async () => {
    const warnAdapter = new SentryAdapter({ dsn: '', level: 'warning' });
    await warnAdapter.save({ action: 'user.delete', resource: 'user', resourceId: 'u1' });

    expect(mockAddBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({ level: 'warning' }));
  });

  it('find() should return empty array', async () => {
    const results = await adapter.find({});
    expect(results).toEqual([]);
  });

  it('count() should return 0', async () => {
    const count = await adapter.count({});
    expect(count).toBe(0);
  });

  it('findById() should return null', async () => {
    const result = await adapter.findById('any');
    expect(result).toBeNull();
  });
});
