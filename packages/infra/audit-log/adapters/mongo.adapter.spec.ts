jest.mock(
  'mongodb',
  () => {
    const mockInsertOne = jest.fn();
    const mockFind = jest.fn();
    const mockCountDocuments = jest.fn();
    const mockFindOne = jest.fn();
    const mockSort = jest.fn();
    const mockSkip = jest.fn();
    const mockLimit = jest.fn();
    const mockToArray = jest.fn();
    const mockCollection = jest.fn(() => ({
      insertOne: mockInsertOne,
      find: mockFind,
      countDocuments: mockCountDocuments,
      findOne: mockFindOne,
    }));
    const mockDb = jest.fn(() => ({ collection: mockCollection }));
    const mockClient = jest.fn(() => ({ db: mockDb }));

    // Chain for find().sort().skip().limit().toArray()
    mockFind.mockReturnValue({
      sort: jest.fn(() => ({
        skip: jest.fn(() => ({ limit: jest.fn(() => ({ toArray: mockToArray })) })),
      })),
    });

    return {
      MongoClient: mockClient,
      ObjectId: jest.fn((id: string) => id),
    };
  },
  { virtual: true },
);

import { MongoAdapter } from './mongo.adapter';

const MockMongoClient = jest.requireMock('mongodb').MongoClient;
const mockInsertOne = jest.requireMock('mongodb').MongoClient().db().collection().insertOne;
const mockToArray = jest
  .requireMock('mongodb')
  .MongoClient()
  .db()
  .collection()
  .find()
  .sort()
  .skip()
  .limit().toArray;
const mockCountDocuments = jest
  .requireMock('mongodb')
  .MongoClient()
  .db()
  .collection().countDocuments;
const mockFindOne = jest.requireMock('mongodb').MongoClient().db().collection().findOne;

describe('MongoAdapter', () => {
  let adapter: MongoAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new MongoAdapter({ uri: 'mongodb://localhost:27017' });
  });

  it('should save an entry via insertOne', async () => {
    mockInsertOne.mockResolvedValue({ insertedId: 'mongo-1' });

    const result = await adapter.save({
      action: 'user.login',
      resource: 'user',
      resourceId: 'u1',
    });

    expect(mockInsertOne).toHaveBeenCalled();
    expect(result.id).toBe('mongo-1');
    expect(result.action).toBe('user.login');
  });

  it('should find entries with filters', async () => {
    mockToArray.mockResolvedValue([
      {
        _id: { toString: () => 'mongo-1' },
        action: 'user.login',
        resource: 'user',
        resourceId: 'u1',
        createdAt: new Date(),
      },
    ]);

    const results = await adapter.find({ action: 'user.login' });

    expect(mockToArray).toHaveBeenCalled();
    expect(results).toHaveLength(1);
    expect(results[0].action).toBe('user.login');
  });

  it('should return empty array on find error', async () => {
    mockToArray.mockRejectedValue(new Error('Mongo error'));

    const results = await adapter.find({});
    expect(results).toEqual([]);
  });

  it('should count via countDocuments', async () => {
    mockCountDocuments.mockResolvedValue(7);

    const count = await adapter.count({ action: 'user.login' });
    expect(count).toBe(7);
  });

  it('should return 0 on count error', async () => {
    mockCountDocuments.mockRejectedValue(new Error('error'));

    const count = await adapter.count({});
    expect(count).toBe(0);
  });

  it('should findById via findOne', async () => {
    mockFindOne.mockResolvedValue({
      _id: { toString: () => 'mongo-1' },
      action: 'login',
      resource: 'user',
      resourceId: '1',
      createdAt: new Date(),
    });

    const result = await adapter.findById('mongo-1');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('mongo-1');
  });

  it('findById should return null when not found', async () => {
    mockFindOne.mockResolvedValue(null);

    const result = await adapter.findById('missing');
    expect(result).toBeNull();
  });
});
