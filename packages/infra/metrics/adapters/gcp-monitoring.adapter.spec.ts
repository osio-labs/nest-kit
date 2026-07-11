const mockCreateTimeSeries = jest.fn().mockResolvedValue(undefined);

jest.mock(
  '@google-cloud/monitoring',
  () => ({
    Monitoring: jest.fn().mockImplementation(() => ({ createTimeSeries: mockCreateTimeSeries })),
  }),
  { virtual: true },
);

import { GcpMonitoringAdapter } from './gcp-monitoring.adapter.js';

describe('GcpMonitoringAdapter', () => {
  let adapter: GcpMonitoringAdapter;
  const mockClient = { createTimeSeries: mockCreateTimeSeries };

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new GcpMonitoringAdapter({
      client: mockClient as any,
      projectId: 'test-project',
    });
  });

  afterEach(async () => {
    await adapter.destroy();
  });

  it('should buffer counter and flush', async () => {
    adapter.counter('request_count', 1, { method: 'GET' });
    await adapter.destroy();
    expect(mockCreateTimeSeries).toHaveBeenCalledTimes(1);
    const args = mockCreateTimeSeries.mock.calls[0][0];
    expect(args.timeSeries).toHaveLength(1);
    expect(args.timeSeries[0].metric.type).toBe('custom.googleapis.com/request_count');
    expect(args.timeSeries[0].metricKind).toBe('CUMULATIVE');
  });

  it('should record gauge', async () => {
    adapter.gauge('memory_usage', 512);
    await adapter.destroy();
    const ts = mockCreateTimeSeries.mock.calls[0][0].timeSeries[0];
    expect(ts.metricKind).toBe('GAUGE');
    expect(ts.valueType).toBe('DOUBLE');
  });

  it('should record timing', async () => {
    adapter.timing('db_query', 42, { db: 'pg' });
    await adapter.destroy();
    const ts = mockCreateTimeSeries.mock.calls[0][0].timeSeries[0];
    expect(ts.metric.labels).toEqual({ db: 'pg' });
  });

  it('should flush nothing when buffer is empty', async () => {
    await adapter.destroy();
    expect(mockCreateTimeSeries).not.toHaveBeenCalled();
  });
});
