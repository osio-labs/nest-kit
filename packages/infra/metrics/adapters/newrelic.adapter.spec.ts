const mockSend = jest.fn().mockResolvedValue(undefined);
const mockCounterMetric = jest.fn();
const mockGaugeMetric = jest.fn();
const mockSummaryMetric = jest.fn();

jest.mock(
  '@newrelic/telemetry-sdk',
  () => ({
    MetricClient: jest.fn().mockImplementation(() => ({ send: mockSend })),
    CounterMetric: mockCounterMetric,
    GaugeMetric: mockGaugeMetric,
    SummaryMetric: mockSummaryMetric,
  }),
  { virtual: true },
);

import { NewRelicAdapter } from './newrelic.adapter';

describe('NewRelicAdapter', () => {
  let adapter: NewRelicAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new NewRelicAdapter({
      client: { send: mockSend } as any,
      apiKey: 'test-key',
    });
  });

  it('should send counter metric', async () => {
    await adapter.counter('requests', 1, { method: 'GET' });
    expect(mockCounterMetric).toHaveBeenCalledWith({
      name: 'requests',
      value: 1,
      attributes: { method: 'GET' },
    });
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('should send gauge metric', async () => {
    await adapter.gauge('memory', 512);
    expect(mockGaugeMetric).toHaveBeenCalledWith({ name: 'memory', value: 512, attributes: {} });
  });

  it('should send summary metric for histogram', async () => {
    await adapter.histogram('latency', 100);
    expect(mockSummaryMetric).toHaveBeenCalledWith({
      name: 'latency',
      count: 1,
      sum: 100,
      attributes: {},
    });
  });

  it('should send summary metric for timing', async () => {
    await adapter.timing('db_query', 42, { db: 'pg' });
    expect(mockSummaryMetric).toHaveBeenCalledWith({
      name: 'db_query',
      count: 1,
      sum: 42,
      attributes: { db: 'pg' },
    });
  });
});
