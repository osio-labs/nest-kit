const mockSdc = {
  counter: jest.fn(),
  gauge: jest.fn(),
  histogram: jest.fn(),
  timing: jest.fn(),
};

jest.mock(
  'statsd-client',
  () => {
    const mock = jest.fn().mockImplementation(() => mockSdc);
    return mock;
  },
  { virtual: true },
);

import { StatsdAdapter } from './statsd.adapter';

describe('StatsdAdapter', () => {
  let adapter: StatsdAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new StatsdAdapter({ client: mockSdc, prefix: 'app' });
  });

  it('should send counter', () => {
    adapter.counter('requests', 1, { method: 'GET' });
    expect(mockSdc.counter).toHaveBeenCalledWith('requests', 1, { method: 'GET' });
  });

  it('should send gauge', () => {
    adapter.gauge('memory', 512);
    expect(mockSdc.gauge).toHaveBeenCalledWith('memory', 512, undefined);
  });

  it('should send histogram', () => {
    adapter.histogram('response_size', 2048);
    expect(mockSdc.histogram).toHaveBeenCalledWith('response_size', 2048, undefined);
  });

  it('should send timing', () => {
    adapter.timing('db_query', 42, { db: 'pg' });
    expect(mockSdc.timing).toHaveBeenCalledWith('db_query', 42, { db: 'pg' });
  });

  it('should not throw on send error', () => {
    mockSdc.counter.mockImplementationOnce(() => {
      throw new Error('conn refused');
    });
    expect(() => adapter.counter('test', 1)).not.toThrow();
  });
});
