const mockWriteApi = {
  writePoint: jest.fn(),
  close: jest.fn().mockResolvedValue(undefined),
};
const mockPoint = jest.fn().mockImplementation((measurement) => ({
  floatField: jest.fn().mockReturnThis(),
  tag: jest.fn().mockReturnThis(),
  timestamp: jest.fn().mockReturnThis(),
}));

jest.mock(
  '@influxdata/influxdb-client',
  () => ({
    InfluxDB: jest.fn().mockImplementation(() => ({
      getWriteApi: jest.fn().mockReturnValue(mockWriteApi),
      Point: mockPoint,
    })),
    Point: mockPoint,
  }),
  { virtual: true },
);

import { InfluxDbAdapter } from './influxdb.adapter.js';

describe('InfluxDbAdapter', () => {
  let adapter: InfluxDbAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    const { InfluxDB } = jest.requireMock('@influxdata/influxdb-client');
    adapter = new InfluxDbAdapter({
      client: new InfluxDB(),
      org: 'test-org',
      bucket: 'test-bucket',
    });
  });

  it('should write counter point', async () => {
    await adapter.counter('request_count', 1, { method: 'GET' });
    expect(mockPoint).toHaveBeenCalledWith('request_count');
    expect(mockWriteApi.writePoint).toHaveBeenCalled();
    expect(mockWriteApi.close).toHaveBeenCalled();
  });

  it('should write gauge point', async () => {
    await adapter.gauge('memory_usage', 512);
    expect(mockPoint).toHaveBeenCalledWith('memory_usage');
  });

  it('should write timing point', async () => {
    await adapter.timing('db_query', 42, { db: 'pg' });
    expect(mockWriteApi.writePoint).toHaveBeenCalled();
  });
});
