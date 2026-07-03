const mockSend = jest.fn().mockResolvedValue(undefined);

jest.mock(
  '@aws-sdk/client-cloudwatch',
  () => ({
    CloudWatchClient: jest.fn().mockImplementation(() => ({ send: mockSend })),
    PutMetricDataCommand: jest.fn().mockImplementation((params) => params),
  }),
  { virtual: true },
);

import { CloudWatchAdapter } from './cloudwatch.adapter';

describe('CloudWatchAdapter', () => {
  let adapter: CloudWatchAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new CloudWatchAdapter({ client: { send: mockSend } as any, flushIntervalMs: 50000 });
  });

  afterEach(async () => {
    await adapter.destroy();
  });

  it('should buffer counter metric and flush', async () => {
    adapter.counter('RequestCount', 1, { Method: 'GET' });
    adapter.counter('RequestCount', 2, { Method: 'POST' });
    expect(mockSend).not.toHaveBeenCalled();
    await adapter.destroy();
    expect(mockSend).toHaveBeenCalledTimes(1);
    const command = mockSend.mock.calls[0][0];
    expect(command.Namespace).toBe('NestKit/Metrics');
    expect(command.MetricData).toHaveLength(2);
    expect(command.MetricData[0].MetricName).toBe('RequestCount');
    expect(command.MetricData[0].Dimensions).toEqual([{ Name: 'Method', Value: 'GET' }]);
  });

  it('should record gauge', async () => {
    adapter.gauge('MemoryUsage', 512, { Host: 'web-1' });
    await adapter.destroy();
    const data = mockSend.mock.calls[0][0].MetricData[0];
    expect(data.MetricName).toBe('MemoryUsage');
    expect(data.Unit).toBe('None');
    expect(data.Value).toBe(512);
  });

  it('should record histogram', async () => {
    adapter.histogram('ResponseSize', 2048);
    await adapter.destroy();
    const data = mockSend.mock.calls[0][0].MetricData[0];
    expect(data.MetricName).toBe('ResponseSize');
  });

  it('should record timing with milliseconds unit', async () => {
    adapter.timing('DbQuery', 42);
    await adapter.destroy();
    const data = mockSend.mock.calls[0][0].MetricData[0];
    expect(data.Unit).toBe('Milliseconds');
    expect(data.Value).toBe(42);
  });

  it('should flush nothing when buffer is empty', async () => {
    await adapter.destroy();
    expect(mockSend).not.toHaveBeenCalled();
  });
});
