const mockStatsD = {
  increment: jest.fn(),
  gauge: jest.fn(),
  histogram: jest.fn(),
  timing: jest.fn(),
};

jest.mock(
  'hot-shots',
  () => ({
    StatsD: jest.fn().mockImplementation(() => mockStatsD),
  }),
  { virtual: true },
);

import { DatadogAdapter } from './datadog.adapter';

describe('DatadogAdapter', () => {
  let adapter: DatadogAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new DatadogAdapter({ client: mockStatsD, prefix: 'app' });
  });

  it('should increment counter', () => {
    adapter.counter('requests.total', 1, { method: 'GET' });
    expect(mockStatsD.increment).toHaveBeenCalledWith('app.requests.total', 1, { method: 'GET' });
  });

  it('should set gauge', () => {
    adapter.gauge('memory.heap', 512);
    expect(mockStatsD.gauge).toHaveBeenCalledWith('app.memory.heap', 512, undefined);
  });

  it('should record histogram', () => {
    adapter.histogram('response.size', 2048);
    expect(mockStatsD.histogram).toHaveBeenCalledWith('app.response.size', 2048, undefined);
  });

  it('should record timing', () => {
    adapter.timing('db.query', 42, { db: 'pg' });
    expect(mockStatsD.timing).toHaveBeenCalledWith('app.db.query', 42, { db: 'pg' });
  });

  it('should use unprefixed name when prefix is empty', () => {
    const noPrefix = new DatadogAdapter({ client: mockStatsD });
    noPrefix.counter('test', 1);
    expect(mockStatsD.increment).toHaveBeenCalledWith('test', 1, undefined);
  });
});
