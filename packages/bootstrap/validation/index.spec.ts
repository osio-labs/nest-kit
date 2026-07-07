import type { INestApplication } from '@nestjs/common';

/* ---------- helpers ---------- */

function mockApp(): INestApplication {
  return {
    useGlobalPipes: jest.fn(),
    useGlobalFilters: jest.fn(),
  } as unknown as INestApplication;
}

/* ---------- configNormalValidation ---------- */

describe('configNormalValidation', () => {
  it('should register ValidationPipe with default options', async () => {
    const app = mockApp();

    const { configNormalValidation } = await import('./normal-validation');
    configNormalValidation(app, {
      transform: true,
      enableImplicitConversion: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      detailedErrors: true,
    });

    expect(app.useGlobalPipes).toHaveBeenCalledWith(
      expect.objectContaining({ constructor: expect.any(Function) }),
    );
  });

  it('should not throw when called', async () => {
    const app = mockApp();

    const { configNormalValidation } = await import('./normal-validation');

    expect(() => configNormalValidation(app, { detailedErrors: false })).not.toThrow();
  });
});

/* ---------- configI18nValidation (requires mock because nestjs-i18n may not be installed) ---------- */

describe('configI18nValidation', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock('nestjs-i18n', () => ({
      I18nValidationPipe: class {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        constructor(..._args: unknown[]) {
          // noop
        }
      },
      I18nValidationExceptionFilter: class {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        constructor(..._args: unknown[]) {
          // noop
        }
      },
    }));
  });

  it('should register I18nValidationPipe', async () => {
    const app = mockApp();

    const { configI18nValidation } = await import('./i18n-validation');
    configI18nValidation(app, {
      transform: true,
      enableImplicitConversion: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(app.useGlobalPipes).toHaveBeenCalledTimes(1);
  });

  it('should register I18nValidationExceptionFilter', async () => {
    const app = mockApp();

    const { configI18nValidation } = await import('./i18n-validation');
    configI18nValidation(app, {});

    expect(app.useGlobalFilters).toHaveBeenCalledTimes(1);
  });
});

/* ---------- configValidation (auto-detect) ---------- */

describe('configValidation', () => {
  let app: INestApplication;

  beforeEach(() => {
    app = mockApp();
  });

  describe('when nestjs-i18n is available', () => {
    beforeEach(() => {
      jest.resetModules();
      jest.doMock('nestjs-i18n', () => ({
        I18nValidationPipe: class {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          constructor(..._args: unknown[]) {
            // noop
          }
        },
        I18nValidationExceptionFilter: class {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          constructor(..._args: unknown[]) {
            // noop
          }
        },
      }));
    });

    it('should use I18nValidationPipe and filter', async () => {
      const { configValidation } = await import('./index');
      await configValidation(app);

      expect(app.useGlobalPipes).toHaveBeenCalledTimes(1);
      expect(app.useGlobalFilters).toHaveBeenCalledTimes(1);
    });
  });

  describe('when nestjs-i18n is not available', () => {
    beforeEach(() => {
      jest.resetModules();
      jest.doMock('nestjs-i18n', () => {
        throw new Error('MODULE_NOT_FOUND');
      });
    });

    it('should fall back to ValidationPipe', async () => {
      const { configValidation } = await import('./index');
      await configValidation(app);

      expect(app.useGlobalPipes).toHaveBeenCalledTimes(1);
      expect(app.useGlobalFilters).not.toHaveBeenCalled();
    });
  });
});
