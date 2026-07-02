import { OciLoggingAdapter } from './oci-logging.adapter';

describe('OciLoggingAdapter', () => {
  let clients: {
    loggingClient: { putLogs: jest.Mock };
    searchClient: { searchLogs: jest.Mock };
    auditClient: { listEvents: jest.Mock };
  };
  let adapter: OciLoggingAdapter;

  beforeEach(() => {
    clients = {
      loggingClient: { putLogs: jest.fn().mockResolvedValue({}) },
      searchClient: { searchLogs: jest.fn() },
      auditClient: { listEvents: jest.fn() },
    };
    adapter = new OciLoggingAdapter({
      logGroupId: 'ocid1.loggroup.oc1.test',
      compartmentId: 'ocid1.compartment.oc1.test',
      loggingClient: clients.loggingClient,
      searchClient: clients.searchClient,
      auditClient: clients.auditClient,
    });
  });

  it('should save an entry via OCI Logging putLogs', async () => {
    const result = await adapter.save({
      action: 'user.login',
      resource: 'user',
      resourceId: 'u1',
    });

    expect(clients.loggingClient.putLogs).toHaveBeenCalled();
    const callArg = clients.loggingClient.putLogs.mock.calls[0][0];
    expect(callArg.logGroupId).toBe('ocid1.loggroup.oc1.test');
    expect(callArg.putLogsDetails.logEntries).toHaveLength(1);
    expect(result.action).toBe('user.login');
    expect(result.id).toBeDefined();
  });

  it('should save with all optional fields', async () => {
    const diff = { email: { from: 'old@test.com', to: 'new@test.com' } };
    await adapter.save({
      action: 'user.updated',
      resource: 'user',
      resourceId: 'u1',
      userId: 'admin',
      organizationId: 'org-1',
      metadata: { reason: 'profile update' },
      diff,
      ip: '10.0.0.1',
      userAgent: 'Mozilla/5.0',
      path: '/admin/users/u1',
    });

    const callArg = clients.loggingClient.putLogs.mock.calls[0][0];
    const logEntry = callArg.putLogsDetails.logEntries[0];
    const data = JSON.parse(logEntry.data);
    expect(data.userId).toBe('admin');
    expect(data.organizationId).toBe('org-1');
    expect(data.path).toBe('/admin/users/u1');
  });

  it('should find entries from custom logs', async () => {
    clients.searchClient.searchLogs.mockResolvedValue({
      searchResult: {
        results: [
          {
            id: 'log-1',
            data: JSON.stringify({ action: 'user.login', resource: 'user', resourceId: 'u1' }),
            time: new Date().toISOString(),
          },
        ],
      },
    });

    const results = await adapter.find({ action: 'user.login' });

    expect(clients.searchClient.searchLogs).toHaveBeenCalled();
    expect(results).toHaveLength(1);
    expect(results[0].action).toBe('user.login');
  });

  it('should also query native Audit API when resource is specified', async () => {
    clients.auditClient.listEvents.mockResolvedValue({
      items: [
        {
          eventId: 'audit-1',
          eventName: 'UpdateUser',
          eventSource: 'user',
          eventTime: new Date().toISOString(),
        },
      ],
    });

    const results = await adapter.find({ resource: 'user' });

    expect(clients.auditClient.listEvents).toHaveBeenCalled();
    expect(results).toHaveLength(1);
  });

  it('should handle missing searchClient gracefully', async () => {
    adapter = new OciLoggingAdapter({
      logGroupId: 'lg-1',
      loggingClient: clients.loggingClient,
      searchClient: null as any,
      auditClient: null as any,
    });

    const result = await adapter.save({ action: 'test', resource: 'test', resourceId: '1' });
    expect(result.action).toBe('test');
  });

  it('should handle errors gracefully in find', async () => {
    clients.searchClient.searchLogs.mockRejectedValue(new Error('error'));
    clients.auditClient.listEvents.mockRejectedValue(new Error('error'));

    const results = await adapter.find({ resource: 'user' });
    expect(results).toEqual([]);
  });

  it('count should return length of find results', async () => {
    clients.searchClient.searchLogs.mockResolvedValue({
      searchResult: {
        results: [
          {
            id: '1',
            data: '{"action":"login","resource":"user","resourceId":"1"}',
            time: new Date().toISOString(),
          },
        ],
      },
    });

    const count = await adapter.count({});
    expect(count).toBe(1);
  });
});
