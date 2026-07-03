const mockCounter = { inc: jest.fn() };
const mockGauge = { set: jest.fn() };
const mockHistogram = { observe: jest.fn() };

jest.mock(
  'prom-client',
  () => ({
    Counter: jest.fn().mockImplementation(() => mockCounter),
    Gauge: jest.fn().mockImplementation(() => mockGauge),
    Histogram: jest.fn().mockImplementation(() => mockHistogram),
    register: {
      setDefaultLabels: jest.fn(),
    },
  }),
  { virtual: true },
);

import { PrometheusAdapter } from './prometheus.adapter';

describe('PrometheusAdapter', () => {
  let adapter: PrometheusAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new PrometheusAdapter({ prefix: 'app' });
  });

  it('should increment counter', () => {
    adapter.counter('requests_total', 1, { method: 'GET' });
    expect(mockCounter.inc).toHaveBeenCalledWith({ method: 'GET' }, 1);
  });

  it('should set gauge', () => {
    adapter.gauge('memory_heap', 512);
    expect(mockGauge.set).toHaveBeenCalledWith({}, 512);
  });

  it('should observe histogram', () => {
    adapter.histogram('request_duration', 150, { path: '/api' });
    expect(mockHistogram.observe).toHaveBeenCalledWith({ path: '/api' }, 150);
  });

  it('should record timing via histogram', () => {
    adapter.timing('db_query', 42, { db: 'pg' });
    expect(mockHistogram.observe).toHaveBeenCalledWith({ db: 'pg' }, 42);
  });

  it('should prefix metric names', () => {
    adapter.counter('test_count', 1);
    const CounterCtor = jest.requireMock('prom-client').Counter;
    expect(CounterCtor).toHaveBeenCalledWith(expect.objectContaining({ name: 'app_test_count' }));
  });
});
