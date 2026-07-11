import { NotificationService } from './notification.service.js';
import type {
  NotificationModuleOptions,
  NotificationRecord,
  NotificationStore,
  ProviderResult,
} from './notification.types.js';
import type { NotificationProvider } from './notification.constants.js';

function createMockProvider(name: string, channel: string, result?: Partial<ProviderResult>) {
  return {
    name,
    channel,
    send: jest.fn<Promise<ProviderResult>, [unknown]>().mockResolvedValue({
      success: true,
      providerName: name,
      channel: channel as any,
      ...result,
    }),
  } as jest.Mocked<NotificationProvider>;
}

function createMockStore(): jest.Mocked<NotificationStore> {
  return {
    save: jest.fn().mockImplementation((record) =>
      Promise.resolve<NotificationRecord>({
        id: 'record-1',
        ...record,
        createdAt: new Date(),
      }),
    ),
    findById: jest.fn().mockResolvedValue(null),
    findByChannel: jest.fn().mockResolvedValue([]),
    updateStatus: jest.fn().mockResolvedValue(undefined),
  };
}

function createMockQueue() {
  return {
    add: jest.fn().mockResolvedValue({ id: 'job-1' }),
  };
}

describe('NotificationService', () => {
  let service: NotificationService;

  function createService(
    options: NotificationModuleOptions,
    store?: NotificationStore,
    queue?: unknown,
  ) {
    service = new NotificationService(options, store, queue);
  }

  // ──────── Single channel: email ────────

  it('should send to email channel successfully', async () => {
    const emailProvider = createMockProvider('sendgrid', 'email');
    const options: NotificationModuleOptions = {
      providers: { email: [emailProvider] },
    };

    createService(options);

    const result = await service.send({
      email: { to: 'a@b.com', subject: 'Hi', body: '<p>Hello</p>' },
    });

    expect(emailProvider.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'a@b.com', subject: 'Hi' }),
    );
    expect(result.success).toBe(true);
    expect(result.channels).toHaveLength(1);
    expect(result.channels[0].channel).toBe('email');
    expect(result.channels[0].results[0].providerName).toBe('sendgrid');
  });

  // ──────── Multiple channels ────────

  it('should send to multiple channels (email + sms)', async () => {
    const emailProvider = createMockProvider('sendgrid', 'email');
    const smsProvider = createMockProvider('twilio', 'sms');

    const options: NotificationModuleOptions = {
      providers: {
        email: [emailProvider],
        sms: [smsProvider],
      },
    };

    createService(options);

    const result = await service.send({
      email: { to: 'a@b.com', subject: 'Hi', body: 'Hello' },
      sms: { to: '+1234567890', body: 'SMS body' },
    });

    expect(emailProvider.send).toHaveBeenCalled();
    expect(smsProvider.send).toHaveBeenCalled();
    expect(result.channels).toHaveLength(2);
    expect(result.success).toBe(true);
  });

  // ──────── Provider failure ────────

  it('should handle provider failure gracefully', async () => {
    const failingProvider = createMockProvider('failmail', 'email', {
      success: false,
      error: 'Connection refused',
    });

    const options: NotificationModuleOptions = {
      providers: { email: [failingProvider] },
    };

    createService(options);

    const result = await service.send({
      email: { to: 'a@b.com', subject: 'Fail', body: 'Will fail' },
    });

    expect(result.success).toBe(false);
    expect(result.channels[0].results[0].success).toBe(false);
    expect(result.channels[0].results[0].error).toBe('Connection refused');
  });

  it('should not throw when a provider throws', async () => {
    const throwingProvider = {
      name: 'thrower',
      channel: 'email',
      send: jest.fn().mockRejectedValue(new Error('Kaboom')),
    } as jest.Mocked<NotificationProvider>;

    const options: NotificationModuleOptions = {
      providers: { email: [throwingProvider] },
    };

    createService(options);

    await expect(
      service.send({
        email: { to: 'a@b.com', subject: 'Boom', body: 'Boom' },
      }),
    ).resolves.toBeDefined();

    expect(throwingProvider.send).toHaveBeenCalled();
  });

  // ──────── Storage ────────

  it('should save to store when storage enabled', async () => {
    const emailProvider = createMockProvider('sendgrid', 'email');
    const store = createMockStore();

    const options: NotificationModuleOptions = {
      providers: { email: [emailProvider] },
      storage: { enabled: true },
    };

    createService(options, store);

    const result = await service.send({
      email: { to: 'a@b.com', subject: 'Stored', body: 'Stored body' },
    });

    expect(store.save).toHaveBeenCalled();
    expect(result.id).toBe('record-1');
  });

  it('should not save to store when storage disabled', async () => {
    const emailProvider = createMockProvider('sendgrid', 'email');
    const store = createMockStore();

    const options: NotificationModuleOptions = {
      providers: { email: [emailProvider] },
      storage: { enabled: false },
    };

    createService(options, store);

    await service.send({
      email: { to: 'a@b.com', subject: 'No store', body: 'Body' },
    });

    expect(store.save).not.toHaveBeenCalled();
  });

  // ──────── Queue ────────

  it('should send to queue when queue enabled', async () => {
    const emailProvider = createMockProvider('sendgrid', 'email');
    const queue = createMockQueue();

    const options: NotificationModuleOptions = {
      providers: { email: [emailProvider] },
      queue: { enabled: true, bull: queue },
    };

    createService(options, undefined, queue);

    const result = await service.send({
      email: { to: 'a@b.com', subject: 'Queued', body: 'Body' },
    });

    expect(queue.add).toHaveBeenCalledWith('notification', {
      email: { to: 'a@b.com', subject: 'Queued', body: 'Body' },
    });
    expect(result.success).toBe(true);
  });

  it('enqueue should return jobId when queue is configured', async () => {
    const queue = createMockQueue();

    createService({ providers: {} }, undefined, queue);

    const result = await service.enqueue({
      email: { to: 'a@b.com', subject: 'Test', body: 'Body' },
    });

    expect(result.queued).toBe(true);
    expect(result.jobId).toBe('job-1');
  });

  it('enqueue should return queued: false when no queue', async () => {
    createService({ providers: {} });

    const result = await service.enqueue({
      email: { to: 'a@b.com', subject: 'Test', body: 'Body' },
    });

    expect(result.queued).toBe(false);
    expect(result.jobId).toBeUndefined();
  });

  // ──────── Parallel ────────

  it('should call providers in parallel when parallel: true', async () => {
    const provider1 = createMockProvider('p1', 'email');
    const provider2 = createMockProvider('p2', 'email');

    const options: NotificationModuleOptions = {
      providers: { email: [provider1, provider2] },
      parallel: true,
    };

    createService(options);

    const result = await service.send({
      email: { to: 'a@b.com', subject: 'Parallel', body: 'Body' },
    });

    expect(result.channels[0].results).toHaveLength(2);
    // Both providers should have been called
    expect(provider1.send).toHaveBeenCalled();
    expect(provider2.send).toHaveBeenCalled();
  });

  // ──────── Sequential ────────

  it('should call providers sequentially when parallel: false', async () => {
    const callOrder: number[] = [];
    const provider1 = {
      name: 'p1',
      channel: 'email',
      send: jest.fn().mockImplementation(async () => {
        callOrder.push(1);
        return { success: true, providerName: 'p1', channel: 'email' as const };
      }),
    };
    const provider2 = {
      name: 'p2',
      channel: 'email',
      send: jest.fn().mockImplementation(async () => {
        callOrder.push(2);
        return { success: true, providerName: 'p2', channel: 'email' as const };
      }),
    };

    const options: NotificationModuleOptions = {
      providers: { email: [provider1, provider2] },
      parallel: false,
    };

    createService(options);

    await service.send({
      email: { to: 'a@b.com', subject: 'Seq', body: 'Body' },
    });

    expect(callOrder).toEqual([1, 2]);
  });

  // ──────── getStatus ────────

  it('getStatus should delegate to store.findById', async () => {
    const store = createMockStore();
    store.findById!.mockResolvedValue({
      id: 'abc',
      channels: ['email'],
      status: 'sent',
      results: [],
      input: {},
      createdAt: new Date(),
    });

    createService({ providers: {} }, store);

    const record = await service.getStatus('abc');
    expect(store.findById).toHaveBeenCalledWith('abc');
    expect(record?.id).toBe('abc');
  });

  it('getStatus should return null when no store configured', async () => {
    createService({ providers: {} });

    const record = await service.getStatus('abc');
    expect(record).toBeNull();
  });

  // ──────── No channels ────────

  it('should return failure when no channels are active', async () => {
    createService({ providers: {} });

    const result = await service.send({});

    expect(result.success).toBe(false);
    expect(result.channels).toHaveLength(0);
  });

  // ──────── Channel detection ────────

  it('should detect telegram channel from input', async () => {
    const telegramProvider = createMockProvider('tg-bot', 'telegram');

    const options: NotificationModuleOptions = {
      providers: { telegram: [telegramProvider] },
    };

    createService(options);

    const result = await service.send({
      telegram: { chatId: 12345, text: 'Hello from TG' },
    });

    expect(result.channels).toHaveLength(1);
    expect(result.channels[0].channel).toBe('telegram');
  });
});
