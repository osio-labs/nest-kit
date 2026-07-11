import { ConsoleAdapter } from './console.adapter.js';

describe('ConsoleAdapter', () => {
  let adapter: ConsoleAdapter;
  let logs: string[];

  beforeEach(() => {
    logs = [];
    adapter = new ConsoleAdapter({
      format: 'json',
      logger: (msg: string) => {
        logs.push(msg);
      },
    });
  });

  it('should log entry as JSON and return it with id and createdAt', async () => {
    const result = await adapter.save({
      action: 'user.login',
      resource: 'user',
      resourceId: 'u1',
    });

    expect(result.id).toBeDefined();
    expect(result.action).toBe('user.login');
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(logs).toHaveLength(1);
    expect(() => JSON.parse(logs[0])).not.toThrow();
  });

  it('should log in pretty format', async () => {
    const prettyAdapter = new ConsoleAdapter({
      format: 'pretty',
      logger: (msg: string) => {
        logs.push(msg);
      },
    });

    await prettyAdapter.save({
      action: 'user.login',
      resource: 'user',
      resourceId: 'u1',
      userId: 'usr-1',
    });

    expect(logs.some((l) => l.includes('[AUDIT]'))).toBe(true);
  });

  it('find() should return empty array', async () => {
    const results = await adapter.find({});
    expect(results).toEqual([]);
  });

  it('count() should return 0', async () => {
    const count = await adapter.count({});
    expect(count).toBe(0);
  });

  it('findById() should return null', async () => {
    const result = await adapter.findById('any');
    expect(result).toBeNull();
  });
});
