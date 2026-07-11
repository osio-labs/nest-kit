const mockAddBreadcrumb = jest.fn();

jest.mock(
  '@sentry/node',
  () => ({
    addBreadcrumb: mockAddBreadcrumb,
  }),
  { virtual: true },
);

import { SentryMetricsAdapter } from './sentry.adapter.js';

describe('SentryMetricsAdapter', () => {
  let adapter: SentryMetricsAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new SentryMetricsAdapter({ defaultTags: { app: 'test' } });
  });

  it('should add counter breadcrumb', () => {
    adapter.counter('requests', 1, { method: 'GET' });
    expect(mockAddBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'metric.counter',
        data: expect.objectContaining({ metric: 'requests', value: 1, method: 'GET', app: 'test' }),
      }),
    );
  });

  it('should add gauge breadcrumb', () => {
    adapter.gauge('memory', 512);
    expect(mockAddBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'metric.gauge',
        data: expect.objectContaining({ value: 512 }),
      }),
    );
  });

  it('should add histogram breadcrumb', () => {
    adapter.histogram('latency', 100);
    expect(mockAddBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'metric.histogram',
        data: expect.objectContaining({ value: 100 }),
      }),
    );
  });

  it('should add timing breadcrumb with ms unit', () => {
    adapter.timing('db_query', 42);
    expect(mockAddBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'metric.timing',
        data: expect.objectContaining({ value: 42, unit: 'ms' }),
      }),
    );
  });

  it('should merge default tags with per-call tags', () => {
    adapter.counter('test', 1, { env: 'prod' });
    expect(mockAddBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ app: 'test', env: 'prod' }),
      }),
    );
  });
});
