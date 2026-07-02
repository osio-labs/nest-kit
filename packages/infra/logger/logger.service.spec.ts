import { PinoLoggerService } from './logger.service';
import { getCorrelationId, correlationIdStorage } from './correlation-id';

// ──────── Mock Pino logger ────────

function createMockPino() {
  return {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    fatal: jest.fn(),
    silent: jest.fn(),
    level: 'info',
  };
}

describe('PinoLoggerService', () => {
  let mockPino: ReturnType<typeof createMockPino>;
  let service: PinoLoggerService;

  beforeEach(() => {
    mockPino = createMockPino();
    service = new PinoLoggerService(mockPino as any);
    correlationIdStorage.disable();
  });

  // ──────── Basic message logging ────────

  it('should map log() to pino.info', () => {
    service.log('hello');
    expect(mockPino.info).toHaveBeenCalledWith('hello');
  });

  it('should map error() to pino.error', () => {
    service.error('boom');
    expect(mockPino.error).toHaveBeenCalledWith('boom');
  });

  it('should map warn() to pino.warn', () => {
    service.warn('caution');
    expect(mockPino.warn).toHaveBeenCalledWith('caution');
  });

  it('should map debug() to pino.debug', () => {
    service.debug('debug-msg');
    expect(mockPino.debug).toHaveBeenCalledWith('debug-msg');
  });

  it('should map verbose() to pino.trace', () => {
    service.verbose('verbose-msg');
    expect(mockPino.trace).toHaveBeenCalledWith('verbose-msg');
  });

  it('should map fatal() to pino.fatal', () => {
    service.fatal('critical');
    expect(mockPino.fatal).toHaveBeenCalledWith('critical');
  });

  // ──────── Context parameter ────────

  it('should pass context as an object property', () => {
    service.log('hello', 'MyService');
    expect(mockPino.info).toHaveBeenCalledWith({ context: 'MyService' }, 'hello');

    service.warn('oh no', 'WarnService');
    expect(mockPino.warn).toHaveBeenCalledWith({ context: 'WarnService' }, 'oh no');

    service.debug('dbg', 'DebugSvc');
    expect(mockPino.debug).toHaveBeenCalledWith({ context: 'DebugSvc' }, 'dbg');

    service.verbose('vrb', 'VerboseSvc');
    expect(mockPino.trace).toHaveBeenCalledWith({ context: 'VerboseSvc' }, 'vrb');
  });

  it('should pass context and trace for error level', () => {
    service.error('error-msg', 'stack-trace', 'ErrCtx');
    expect(mockPino.error).toHaveBeenCalledWith(
      { context: 'ErrCtx', trace: 'stack-trace' },
      'error-msg',
    );
  });

  it('should pass context and trace for fatal level', () => {
    service.fatal('fatal-msg', 'stack-trace', 'FatalCtx');
    expect(mockPino.fatal).toHaveBeenCalledWith(
      { context: 'FatalCtx', trace: 'stack-trace' },
      'fatal-msg',
    );
  });

  it('should handle error without trace but with context', () => {
    // NestJS signature: .error(message, '', context) - empty trace
    service.error('err', '', 'Ctx');
    expect(mockPino.error).toHaveBeenCalledWith({ context: 'Ctx' }, 'err');
  });

  // ──────── Correlation ID ────────

  it('should include correlationId in log when present', () => {
    correlationIdStorage.enterWith('cid-001');
    service.log('with-cid', 'Svc');
    expect(mockPino.info).toHaveBeenCalledWith(
      { correlationId: 'cid-001', context: 'Svc' },
      'with-cid',
    );
  });

  it('should include correlationId without context', () => {
    correlationIdStorage.enterWith('cid-002');
    service.log('just-cid');
    expect(mockPino.info).toHaveBeenCalledWith({ correlationId: 'cid-002' }, 'just-cid');
  });

  // ──────── Structured object message ────────

  it('should merge structured object with base metadata', () => {
    service.log({ userId: 1, action: 'login' }, 'MySvc');
    expect(mockPino.info).toHaveBeenCalledWith({ userId: 1, action: 'login', context: 'MySvc' });
  });

  it('should merge structured object with base metadata and correlationId', () => {
    correlationIdStorage.enterWith('cid-003');
    service.log({ userId: 2 }, 'MySvc');
    expect(mockPino.info).toHaveBeenCalledWith({
      userId: 2,
      context: 'MySvc',
      correlationId: 'cid-003',
    });
  });

  it('should merge structured object for error level', () => {
    service.error({ code: 'E001' }, 'MySvc');
    // When message is an object, it goes as the single argument
    expect(mockPino.error).toHaveBeenCalledWith({ code: 'E001', context: 'MySvc' });
  });

  // ──────── getPinoLogger ────────

  it('should return the raw pino logger via getPinoLogger()', () => {
    expect(service.getPinoLogger()).toBe(mockPino);
  });

  // ──────── child / fromPino ────────

  it('should create a child logger with bound context via child()', () => {
    const childPino = { ...mockPino, child: jest.fn(() => ({ ...mockPino, level: 'info' })) };
    const parent = new PinoLoggerService(childPino as any);
    const child = parent.child({ service: 'payments' });
    expect(childPino.child).toHaveBeenCalledWith({ service: 'payments' });
    expect(child).toBeInstanceOf(PinoLoggerService);
  });

  it('should create a service instance via fromPino()', () => {
    const instance = PinoLoggerService.fromPino(mockPino as any);
    expect(instance).toBeInstanceOf(PinoLoggerService);
    expect(instance.getPinoLogger()).toBe(mockPino);
  });

  it('child logger should route calls to the underlying pino child', () => {
    const childPino = { ...mockPino, child: jest.fn(() => mockPino) };
    const parent = new PinoLoggerService(childPino as any);
    const child = parent.child({ module: 'test' });
    child.log('from-child');
    expect(mockPino.info).toHaveBeenCalledWith('from-child');
  });
});
