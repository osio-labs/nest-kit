jest.mock(
  '@elastic/elasticsearch',
  () => {
    const mockIndex = jest.fn();
    const mockSearch = jest.fn();
    const mockCount = jest.fn();
    const mockGet = jest.fn();
    return {
      Client: jest.fn(() => ({
        index: mockIndex,
        search: mockSearch,
        count: mockCount,
        get: mockGet,
      })),
    };
  },
  { virtual: true },
);

import { ElasticsearchAdapter } from './elasticsearch.adapter';

const MockClient = jest.requireMock('@elastic/elasticsearch').Client;

describe('ElasticsearchAdapter', () => {
  let client: { index: jest.Mock; search: jest.Mock; count: jest.Mock; get: jest.Mock };
  let adapter: ElasticsearchAdapter;

  beforeEach(() => {
    client = { index: jest.fn(), search: jest.fn(), count: jest.fn(), get: jest.fn() };
    (MockClient as jest.Mock).mockImplementation(() => client);
    adapter = new ElasticsearchAdapter({ node: 'http://localhost:9200' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should save an entry via client.index', async () => {
    client.index.mockResolvedValue({ _id: 'es-1' });

    const result = await adapter.save({
      action: 'user.login',
      resource: 'user',
      resourceId: 'u1',
    });

    expect(client.index).toHaveBeenCalledWith(expect.objectContaining({ index: 'audit-log' }));
    expect(result.id).toBe('es-1');
    expect(result.action).toBe('user.login');
  });

  it('should find entries via client.search', async () => {
    client.search.mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'es-1',
            _source: {
              action: 'user.login',
              resource: 'user',
              resourceId: 'u1',
              '@timestamp': new Date().toISOString(),
            },
          },
        ],
      },
    });

    const results = await adapter.find({ action: 'user.login' });

    expect(client.search).toHaveBeenCalled();
    expect(results).toHaveLength(1);
    expect(results[0].action).toBe('user.login');
  });

  it('should return empty array on search error', async () => {
    client.search.mockRejectedValue(new Error('ES error'));

    const results = await adapter.find({});
    expect(results).toEqual([]);
  });

  it('should count via client.count', async () => {
    client.count.mockResolvedValue({ count: 42 });

    const count = await adapter.count({ action: 'user.login' });
    expect(count).toBe(42);
  });

  it('should return 0 on count error', async () => {
    client.count.mockRejectedValue(new Error('error'));

    const count = await adapter.count({});
    expect(count).toBe(0);
  });

  it('should findById via client.get', async () => {
    client.get.mockResolvedValue({
      found: true,
      _id: 'es-1',
      _source: {
        action: 'login',
        resource: 'user',
        resourceId: '1',
        '@timestamp': new Date().toISOString(),
      },
    });

    const result = await adapter.findById('es-1');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('es-1');
  });

  it('findById should return null when not found', async () => {
    client.get.mockResolvedValue({ found: false });

    const result = await adapter.findById('missing');
    expect(result).toBeNull();
  });

  it('findById should return null on error', async () => {
    client.get.mockRejectedValue(new Error('not found'));

    const result = await adapter.findById('missing');
    expect(result).toBeNull();
  });
});
