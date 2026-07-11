jest.mock(
  'pangea-node-sdk',
  () => ({
    PangeaConfig: jest.fn(() => ({})),
    AuditService: jest.fn(),
  }),
  { virtual: true },
);

import { PangeaAdapter } from './pangea.adapter.js';

const MockAuditService = jest.requireMock('pangea-node-sdk').AuditService;

describe('PangeaAdapter', () => {
  let auditMock: { log: jest.Mock; search: jest.Mock };
  let adapter: PangeaAdapter;

  beforeEach(() => {
    auditMock = {
      log: jest.fn(),
      search: jest.fn(),
    };
    (MockAuditService as jest.Mock).mockImplementation(() => auditMock);
    process.env.PANGEA_AUDIT_TOKEN = 'test-token';
    process.env.PANGEA_DOMAIN = 'aws.us.pangea.cloud';
    adapter = new PangeaAdapter();
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.PANGEA_AUDIT_TOKEN;
    delete process.env.PANGEA_DOMAIN;
  });

  it('should save an entry via Pangea Audit.log', async () => {
    auditMock.log.mockResolvedValue({
      result: {
        envelope: {
          leaf_hash: 'hash-1',
          received_at: new Date().toISOString(),
        },
      },
    });

    const result = await adapter.save({
      action: 'user.login',
      resource: 'user',
      resourceId: 'u1',
      userId: 'user-1',
    });

    expect(auditMock.log).toHaveBeenCalled();
    const eventArg = auditMock.log.mock.calls[0][0];
    expect(eventArg.action).toBe('user.login');
    expect(eventArg.actor).toBe('user-1');
    expect(eventArg.target).toBe('user:u1');
    expect(result.id).toBe('hash-1');
  });

  it('should pass configId to log when set', async () => {
    adapter = new PangeaAdapter({ configId: 'cfg-123' });
    auditMock.log.mockResolvedValue({
      result: { envelope: { leaf_hash: 'h', received_at: new Date().toISOString() } },
    });

    await adapter.save({
      action: 'test',
      resource: 'test',
      resourceId: '1',
    });

    expect(auditMock.log).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ configId: 'cfg-123' }),
    );
  });

  it('should include diff as old/new fields', async () => {
    auditMock.log.mockResolvedValue({
      result: { envelope: { leaf_hash: 'h', received_at: new Date().toISOString() } },
    });

    const diff = { status: { from: 'pending', to: 'confirmed' } };
    await adapter.save({
      action: 'order.updated',
      resource: 'order',
      resourceId: 'order-1',
      diff,
    });

    const eventArg = auditMock.log.mock.calls[0][0];
    expect(eventArg.old).toEqual({ status: 'pending' });
    expect(eventArg.new).toEqual({ status: 'confirmed' });
  });

  it('should include optional fields', async () => {
    auditMock.log.mockResolvedValue({
      result: { envelope: { leaf_hash: 'h', received_at: new Date().toISOString() } },
    });

    await adapter.save({
      action: 'test',
      resource: 'test',
      resourceId: '1',
      metadata: { reason: 'test' },
      userAgent: 'TestAgent/1.0',
      path: '/test',
      organizationId: 'org-1',
    });

    const eventArg = auditMock.log.mock.calls[0][0];
    expect(eventArg.metadata).toEqual({ reason: 'test' });
    expect(eventArg.user_agent).toBe('TestAgent/1.0');
    expect(eventArg.path).toBe('/test');
    expect(eventArg.organization).toBe('org-1');
  });

  it('should find entries via Pangea Audit.search', async () => {
    auditMock.search.mockResolvedValue({
      result: {
        events: [
          {
            envelope: {
              leaf_hash: 'hash-1',
              action: 'user.login',
              target: 'user:u1',
              actor: 'user-1',
              received_at: new Date().toISOString(),
            },
          },
        ],
        count: 1,
      },
    });

    const results = await adapter.find({ action: 'user.login' });

    expect(auditMock.search).toHaveBeenCalled();
    expect(results).toHaveLength(1);
    expect(results[0].action).toBe('user.login');
  });

  it('should pass configId to search when set', async () => {
    adapter = new PangeaAdapter({ configId: 'cfg-123' });
    auditMock.search.mockResolvedValue({ result: { events: [], count: 0 } });

    await adapter.find({});

    expect(auditMock.search).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ configId: 'cfg-123' }),
    );
  });

  it('should return empty array on search error', async () => {
    auditMock.search.mockRejectedValue(new Error('API error'));

    const results = await adapter.find({});
    expect(results).toEqual([]);
  });

  it('count should call search and return count', async () => {
    auditMock.search.mockResolvedValue({ result: { count: 42 } });

    const count = await adapter.count({});
    expect(count).toBe(42);
  });

  it('count should return 0 on error', async () => {
    auditMock.search.mockRejectedValue(new Error('error'));

    const count = await adapter.count({});
    expect(count).toBe(0);
  });

  it('findById should search by leaf_hash', async () => {
    auditMock.search.mockResolvedValue({ result: { events: [], count: 0 } });

    const result = await adapter.findById('some-hash');
    expect(auditMock.search).toHaveBeenCalled();
    expect(result).toBeNull();
  });
});
