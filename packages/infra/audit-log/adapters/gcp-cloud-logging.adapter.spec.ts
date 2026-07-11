import { GcpCloudLoggingAdapter } from './gcp-cloud-logging.adapter.js';

describe('GcpCloudLoggingAdapter', () => {
  let logEntryMock: { metadata: { insertId: string }; data: Record<string, unknown> };
  let logMock: { entry: jest.Mock; write: jest.Mock };
  let loggingMock: { log: jest.Mock; getEntries: jest.Mock };
  let adapter: GcpCloudLoggingAdapter;

  beforeEach(() => {
    logEntryMock = {
      metadata: { insertId: 'log-1' },
      data: { jsonPayload: { action: 'test', resource: 'r', resourceId: '1' } },
    };
    logMock = {
      entry: jest.fn().mockReturnValue(logEntryMock),
      write: jest.fn().mockResolvedValue([{}]),
    };
    loggingMock = {
      log: jest.fn().mockReturnValue(logMock),
      getEntries: jest.fn(),
    };
    adapter = new GcpCloudLoggingAdapter({ client: loggingMock });
  });

  it('should save an entry to Cloud Logging', async () => {
    const result = await adapter.save({
      action: 'order.created',
      resource: 'order',
      resourceId: 'order-1',
      userId: 'user-1',
    });

    expect(loggingMock.log).toHaveBeenCalledWith('audit-trail');
    expect(logMock.entry).toHaveBeenCalled();
    expect(logMock.write).toHaveBeenCalled();
    expect(result.action).toBe('order.created');
    expect(result.id).toBe('log-1');
  });

  it('should save with metadata and diff', async () => {
    const diff = { price: { from: 100, to: 90 } };
    const result = await adapter.save({
      action: 'order.updated',
      resource: 'order',
      resourceId: 'order-1',
      metadata: { reason: 'discount' },
      diff,
    });

    expect(result.metadata).toEqual({ reason: 'discount' });
    expect(result.diff).toEqual(diff);
  });

  it('should set resource type from options', async () => {
    adapter = new GcpCloudLoggingAdapter({ client: loggingMock, resourceType: 'k8s_container' });

    await adapter.save({
      action: 'deploy',
      resource: 'app',
      resourceId: 'v2',
    });

    const entryCall = logMock.entry.mock.calls[0];
    expect(entryCall[0].resource.type).toBe('k8s_container');
  });

  it('should set custom log name from options', async () => {
    adapter = new GcpCloudLoggingAdapter({ client: loggingMock, logName: 'custom-audit' });

    await adapter.save({
      action: 'test',
      resource: 'test',
      resourceId: '1',
    });

    expect(loggingMock.log).toHaveBeenCalledWith('custom-audit');
  });

  it('should find entries via getEntries', async () => {
    loggingMock.getEntries.mockResolvedValue([
      [
        {
          metadata: { insertId: 'log-1', timestamp: new Date().toISOString() },
          data: {
            jsonPayload: {
              action: 'user.login',
              resource: 'user',
              resourceId: 'u1',
            },
          },
        },
      ],
    ]);

    const results = await adapter.find({ action: 'user.login' });

    expect(loggingMock.getEntries).toHaveBeenCalled();
    expect(results).toHaveLength(1);
    expect(results[0].action).toBe('user.login');
  });

  it('should return empty array on find error', async () => {
    loggingMock.getEntries.mockRejectedValue(new Error('API error'));

    const results = await adapter.find({});
    expect(results).toEqual([]);
  });

  it('should handle empty getEntries response', async () => {
    loggingMock.getEntries.mockResolvedValue([null]);

    const results = await adapter.find({});
    expect(results).toEqual([]);
  });

  it('count should use find internally', async () => {
    loggingMock.getEntries.mockResolvedValue([
      [
        {
          metadata: { insertId: '1' },
          data: {
            jsonPayload: { action: 'test', resource: 'r', resourceId: '1' },
          },
        },
      ],
    ]);

    const count = await adapter.count({});
    expect(count).toBe(1);
  });

  it('findById should return matching entry', async () => {
    loggingMock.getEntries.mockResolvedValue([
      [
        {
          metadata: { insertId: 'target' },
          data: { jsonPayload: { action: 'login', resource: 'user', resourceId: '1' } },
        },
        {
          metadata: { insertId: 'other' },
          data: { jsonPayload: { action: 'logout', resource: 'user', resourceId: '1' } },
        },
      ],
    ]);

    const result = await adapter.findById('target');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('target');
  });
});
