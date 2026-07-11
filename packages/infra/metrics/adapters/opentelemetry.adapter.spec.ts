const mockCounter = { add: jest.fn() };
const mockGauge = { record: jest.fn() };
const mockHistogram = { record: jest.fn() };
const mockMeter = {
  createCounter: jest.fn().mockReturnValue(mockCounter),
  createGauge: jest.fn().mockReturnValue(mockGauge),
  createHistogram: jest.fn().mockReturnValue(mockHistogram),
};

jest.mock(
  '@opentelemetry/api',
  () => ({
    metrics: {
      getMeter: jest.fn().mockReturnValue(mockMeter),
    },
  }),
  { virtual: true },
);

import { OpenTelemetryAdapter } from './opentelemetry.adapter.js';

describe('OpenTelemetryAdapter', () => {
  let adapter: OpenTelemetryAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new OpenTelemetryAdapter();
  });

  it('should add counter', () => {
    adapter.counter('requests', 1, { method: 'GET' });
    expect(mockCounter.add).toHaveBeenCalledWith(1, { method: 'GET' });
  });

  it('should record gauge', () => {
    adapter.gauge('memory', 512);
    expect(mockGauge.record).toHaveBeenCalledWith(512, {});
  });

  it('should record histogram', () => {
    adapter.histogram('latency', 100);
    expect(mockHistogram.record).toHaveBeenCalledWith(100, {});
  });

  it('should record timing', () => {
    adapter.timing('db_query', 42, { db: 'pg' });
    expect(mockHistogram.record).toHaveBeenCalledWith(42, { db: 'pg' });
  });

  it('should create instruments only once', () => {
    adapter.counter('req', 1);
    adapter.counter('req', 2);
    expect(mockMeter.createCounter).toHaveBeenCalledTimes(1);
  });
});
