import { CloudTrailAdapter } from './cloudtrail.adapter.js';

jest.mock(
  '@aws-sdk/client-cloudtrail',
  () => ({
    CloudTrailClient: jest.fn(),
    PutAuditEventsCommand: jest.fn((args: any) => args),
    LookupEventsCommand: jest.fn(() => ({})),
  }),
  { virtual: true },
);

const MockCloudTrailClient = jest.requireMock('@aws-sdk/client-cloudtrail').CloudTrailClient;

describe('CloudTrailAdapter', () => {
  let sendMock: jest.Mock;
  let adapter: CloudTrailAdapter;

  beforeEach(() => {
    sendMock = jest.fn();
    (MockCloudTrailClient as jest.Mock).mockImplementation(() => ({ send: sendMock }));
    adapter = new CloudTrailAdapter({ region: 'us-east-1' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should save an entry via PutAuditEvents', async () => {
    sendMock.mockResolvedValue({});

    const result = await adapter.save({
      action: 'user.login',
      resource: 'user',
      resourceId: 'u1',
      userId: 'user-1',
    });

    expect(sendMock).toHaveBeenCalled();
    expect(result.action).toBe('user.login');
    expect(result.id).toBeDefined();
  });

  it('should handle save without resourceId', async () => {
    sendMock.mockResolvedValue({});

    const result = await adapter.save({
      action: 'system.startup',
      resource: 'system',
      resourceId: '',
    });

    expect(sendMock).toHaveBeenCalled();
    expect(result.action).toBe('system.startup');
    expect(result.resourceId).toBe('');
  });

  it('should find entries via LookupEvents', async () => {
    sendMock.mockResolvedValue({
      Events: [{ EventId: 'e1', EventName: 'login', EventSource: 'user', EventTime: new Date() }],
    });

    const results = await adapter.find({});

    expect(sendMock).toHaveBeenCalled();
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('e1');
  });

  it('should return empty array on find error', async () => {
    sendMock.mockRejectedValue(new Error('API error'));

    const results = await adapter.find({});
    expect(results).toEqual([]);
  });

  it('count should return length of find results', async () => {
    sendMock.mockResolvedValue({
      Events: [{ EventId: 'e1', EventName: 'test', EventSource: 's', EventTime: new Date() }],
    });

    const count = await adapter.count({});
    expect(count).toBe(1);
  });

  it('findById should return matching entry', async () => {
    sendMock.mockResolvedValue({
      Events: [
        { EventId: 'target', EventName: 'login', EventSource: 'user', EventTime: new Date() },
        { EventId: 'other', EventName: 'logout', EventSource: 'user', EventTime: new Date() },
      ],
    });

    const result = await adapter.findById('target');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('target');
  });

  it('findById should return null for non-existent', async () => {
    sendMock.mockResolvedValue({ Events: [] });

    const result = await adapter.findById('missing');
    expect(result).toBeNull();
  });
});
