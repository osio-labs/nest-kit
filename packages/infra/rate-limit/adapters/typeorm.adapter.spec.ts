import { TypeOrmRateLimitAdapter } from './typeorm.adapter';

describe('TypeOrmRateLimitAdapter', () => {
  let adapter: TypeOrmRateLimitAdapter;
  const mockRepo = {
    findOneBy: jest.fn(),
    upsert: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new TypeOrmRateLimitAdapter(mockRepo as any);
  });

  it('should allow first request and create row', async () => {
    mockRepo.findOneBy.mockResolvedValue(null);

    const result = await adapter.consume('key-1', 10, 60);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
    expect(result.total).toBe(10);
    expect(mockRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'key-1', count: 1 }),
      ['key'],
    );
  });

  it('should allow request within limit', async () => {
    mockRepo.findOneBy.mockResolvedValue({
      key: 'key-1',
      count: 3,
      expiresAt: Date.now() + 50000,
      windowSeconds: 60,
    });

    const result = await adapter.consume('key-1', 10, 60);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(6);
    expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({ key: 'key-1', count: 4 }));
  });

  it('should block when over limit', async () => {
    const resetTime = Date.now() + 50000;
    mockRepo.findOneBy.mockResolvedValue({
      key: 'key-1',
      count: 10,
      expiresAt: resetTime,
      windowSeconds: 60,
    });

    const result = await adapter.consume('key-1', 10, 60);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.resetTime).toBe(resetTime);
  });

  it('should reset window when expired', async () => {
    mockRepo.findOneBy.mockResolvedValue({
      key: 'key-1',
      count: 10,
      expiresAt: Date.now() - 1000,
      windowSeconds: 60,
    });

    const result = await adapter.consume('key-1', 10, 60);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
    expect(mockRepo.upsert).toHaveBeenCalled();
  });

  it('should reset key', async () => {
    await adapter.reset('key-1');

    expect(mockRepo.delete).toHaveBeenCalledWith({ key: 'key-1' });
  });
});
