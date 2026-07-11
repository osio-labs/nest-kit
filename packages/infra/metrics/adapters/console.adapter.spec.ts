import { ConsoleAdapter } from './console.adapter.js';

describe('ConsoleAdapter', () => {
  let logs: string[];
  let adapter: ConsoleAdapter;

  beforeEach(() => {
    logs = [];
    adapter = new ConsoleAdapter({
      format: 'json',
      logger: (msg: string) => {
        logs.push(msg);
      },
    });
  });

  it('should log counter as JSON', () => {
    adapter.counter('test.count', 1, { env: 'test' });
    expect(logs).toHaveLength(1);
    const parsed = JSON.parse(logs[0]);
    expect(parsed.type).toBe('counter');
    expect(parsed.name).toBe('test.count');
    expect(parsed.value).toBe(1);
    expect(parsed.tags).toEqual({ env: 'test' });
  });

  it('should log gauge as JSON', () => {
    adapter.gauge('test.gauge', 42);
    const parsed = JSON.parse(logs[0]);
    expect(parsed.type).toBe('gauge');
    expect(parsed.value).toBe(42);
  });

  it('should log histogram as JSON', () => {
    adapter.histogram('test.hist', 100);
    const parsed = JSON.parse(logs[0]);
    expect(parsed.type).toBe('histogram');
    expect(parsed.value).toBe(100);
  });

  it('should log timing as JSON', () => {
    adapter.timing('test.time', 250);
    const parsed = JSON.parse(logs[0]);
    expect(parsed.type).toBe('timing');
    expect(parsed.value).toBe(250);
  });

  it('should log in pretty format', () => {
    const pretty = new ConsoleAdapter({
      format: 'pretty',
      logger: (msg: string) => {
        logs.push(msg);
      },
    });
    pretty.counter('test.count', 1);
    expect(logs[0]).toContain('[METRICS]');
    expect(logs[0]).toContain('counter');
  });

  it('should include tags in pretty format', () => {
    const pretty = new ConsoleAdapter({
      format: 'pretty',
      logger: (msg: string) => {
        logs.push(msg);
      },
    });
    pretty.gauge('mem.used', 512, { unit: 'MB' });
    expect(logs[0]).toContain('{"unit":"MB"}');
  });

  it('should use a silent logger when logger is no-op', () => {
    const silent = new ConsoleAdapter({
      format: 'json',
      logger: () => {
        /* no-op */
      },
    });
    silent.counter('test', 1);
    expect(logs).toHaveLength(0);
  });
});
