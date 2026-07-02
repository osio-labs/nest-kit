import { AuditLogService } from './audit-log.service';
import type { AuditLogRepository, AuditLogModuleOptions } from './audit-log.types';

function createMockRepo(): jest.Mocked<AuditLogRepository> {
  return {
    save: jest
      .fn()
      .mockImplementation((entry) =>
        Promise.resolve({ id: 'id-1', createdAt: new Date(), ...entry }),
      ),
    find: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    findById: jest.fn().mockResolvedValue(null),
  };
}

describe('AuditLogService', () => {
  let repo: jest.Mocked<AuditLogRepository>;
  let service: AuditLogService;

  function createService(opts: AuditLogModuleOptions = {}) {
    repo = createMockRepo();
    service = new AuditLogService(opts, repo, undefined);
  }

  beforeEach(() => {
    createService();
  });

  // ──────── record ────────

  it('should save a record via repository', async () => {
    const entry = await service.record({
      action: 'user.login',
      resource: 'user',
      resourceId: 'user-1',
    });

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'user.login', resource: 'user', resourceId: 'user-1' }),
    );
    expect(entry.id).toBe('id-1');
    expect(entry.createdAt).toBeInstanceOf(Date);
  });

  it('should pass userId and organizationId', async () => {
    await service.record({
      action: 'order.created',
      resource: 'order',
      resourceId: 'order-42',
      userId: 'user-5',
      organizationId: 'org-acme',
    });

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-5', organizationId: 'org-acme' }),
    );
  });

  it('should pass metadata and diff', async () => {
    const diff = { status: { from: 'pending' as const, to: 'confirmed' as const } };
    await service.record({
      action: 'order.updated',
      resource: 'order',
      resourceId: 'order-42',
      metadata: { reason: 'price adjustment' },
      diff,
    });

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { reason: 'price adjustment' },
        diff,
      }),
    );
  });

  it('should merge defaultMetadata with provided metadata', async () => {
    createService({ defaultMetadata: { appVersion: '2.0.0' } });

    await service.record({
      action: 'test',
      resource: 'test',
      resourceId: '1',
      metadata: { requestId: 'req-1' },
    });

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { appVersion: '2.0.0', requestId: 'req-1' },
      }),
    );
  });

  it('should skip metadata when both defaultMetadata and params.metadata are empty', async () => {
    await service.record({ action: 'test', resource: 'test', resourceId: '1' });

    const call = (repo.save as jest.Mock).mock.calls[0][0];
    expect(call.metadata).toBeUndefined();
  });

  // ──────── enabledActions ────────

  it('should skip recording when action not in enabledActions', async () => {
    createService({ enabledActions: ['user.login'] });

    const result = await service.record({
      action: 'user.logout',
      resource: 'user',
      resourceId: '1',
    });

    expect(repo.save).not.toHaveBeenCalled();
    expect(result.id).toBe('');
  });

  it('should record when action is in enabledActions', async () => {
    createService({ enabledActions: ['user.login', 'user.logout'] });

    await service.record({ action: 'user.logout', resource: 'user', resourceId: '1' });

    expect(repo.save).toHaveBeenCalled();
  });

  // ──────── excludePaths ────────

  it('should skip recording when path matches excludePaths', async () => {
    createService({ excludePaths: ['/health', '/metrics'] });

    const result = await service.record({
      action: 'read',
      resource: 'health',
      resourceId: '',
      path: '/health',
    });

    expect(repo.save).not.toHaveBeenCalled();
    expect(result.id).toBe('');
  });

  it('should skip recording when path is a sub-path of an excluded prefix', async () => {
    createService({ excludePaths: ['/health'] });

    const result = await service.record({
      action: 'read',
      resource: 'health',
      resourceId: '',
      path: '/health/ping',
    });

    expect(repo.save).not.toHaveBeenCalled();
    expect(result.id).toBe('');
  });

  it('should record when path does not match excludePaths', async () => {
    createService({ excludePaths: ['/health'] });

    await service.record({
      action: 'read',
      resource: 'user',
      resourceId: '1',
      path: '/users',
    });

    expect(repo.save).toHaveBeenCalled();
  });

  // ──────── query methods ────────

  it('find should delegate to repository.find', async () => {
    repo.find.mockResolvedValue([{ id: '1' } as any]);
    const result = await service.find({ resource: 'user' });
    expect(repo.find).toHaveBeenCalledWith({ resource: 'user' });
    expect(result).toHaveLength(1);
  });

  it('count should delegate to repository.count', async () => {
    repo.count.mockResolvedValue(5);
    const result = await service.count({ userId: 'u1' });
    expect(repo.count).toHaveBeenCalledWith({ userId: 'u1' });
    expect(result).toBe(5);
  });

  it('findById should delegate to repository.findById', async () => {
    repo.findById.mockResolvedValue({ id: 'abc' } as any);
    const result = await service.findById('abc');
    expect(repo.findById).toHaveBeenCalledWith('abc');
    expect(result).toEqual({ id: 'abc' });
  });

  it('findByResource should call find with resource and resourceId', async () => {
    jest.spyOn(service, 'find').mockResolvedValue([]);
    await service.findByResource('order', 'order-42');
    expect(service.find).toHaveBeenCalledWith({ resource: 'order', resourceId: 'order-42' });
  });

  it('findByUser should call find with userId and default limit 50', async () => {
    jest.spyOn(service, 'find').mockResolvedValue([]);
    await service.findByUser('user-1');
    expect(service.find).toHaveBeenCalledWith({ userId: 'user-1', limit: 50 });
  });

  it('findByUser should use custom limit', async () => {
    jest.spyOn(service, 'find').mockResolvedValue([]);
    await service.findByUser('user-1', 10);
    expect(service.find).toHaveBeenCalledWith({ userId: 'user-1', limit: 10 });
  });

  it('findByOrganization should call find with organizationId and default limit 50', async () => {
    jest.spyOn(service, 'find').mockResolvedValue([]);
    await service.findByOrganization('org-1');
    expect(service.find).toHaveBeenCalledWith({ organizationId: 'org-1', limit: 50 });
  });

  // ──────── ensureRepository throws ────────

  it('should throw when repository is not configured', async () => {
    const svc = new AuditLogService({}, undefined, undefined);
    await expect(svc.record({ action: 'x', resource: 'y', resourceId: 'z' })).rejects.toThrow(
      'AuditLog repository is not configured',
    );
    await expect(svc.find({})).rejects.toThrow('AuditLog repository is not configured');
    await expect(svc.count({})).rejects.toThrow('AuditLog repository is not configured');
    await expect(svc.findById('x')).rejects.toThrow('AuditLog repository is not configured');
  });

  // ──────── captureIp / captureUserAgent ────────

  it('should pass explicit ip and userAgent without calling request', async () => {
    await service.record({
      action: 'login',
      resource: 'auth',
      resourceId: '',
      ip: '1.2.3.4',
      userAgent: 'TestAgent/1.0',
    });

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ ip: '1.2.3.4', userAgent: 'TestAgent/1.0' }),
    );
  });

  it('should not throw when request is undefined and captureRequestContext is true', async () => {
    await service.record({ action: 'x', resource: 'y', resourceId: 'z' });
    expect(repo.save).toHaveBeenCalled();
  });

  // ──────── path propagation ────────

  it('should pass path to repository.save', async () => {
    await service.record({
      action: 'read',
      resource: 'doc',
      resourceId: 'doc-1',
      path: '/documents/doc-1',
    });

    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ path: '/documents/doc-1' }));
  });
});
