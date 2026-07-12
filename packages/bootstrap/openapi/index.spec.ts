import type { INestApplication } from '@nestjs/common';

const mockConfigScalar = jest.fn();
const mockConfigSwagger = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

describe('configOpenApi', () => {
  let app: INestApplication;

  beforeEach(() => {
    app = { use: jest.fn() } as unknown as INestApplication;
  });

  describe('when @scalar/nestjs-api-reference is available', () => {
    beforeEach(() => {
      jest.resetModules();
      jest.doMock('@nestjs/swagger', () => ({}));
      jest.doMock('@scalar/nestjs-api-reference', () => ({}));
      jest.doMock('./scalar.config', () => ({ configScalarApiDoc: mockConfigScalar }));
      jest.doMock('./swagger.config', () => ({ configSwagger: mockConfigSwagger }));
    });

    it('should call configScalarApiDoc', async () => {
      const { configOpenApi } = await import('./config.js');

      await configOpenApi(app);

      expect(mockConfigScalar).toHaveBeenCalledTimes(1);
      expect(mockConfigSwagger).not.toHaveBeenCalled();
    });

    it('should pass options to configScalarApiDoc', async () => {
      const { configOpenApi } = await import('./config.js');
      const options = { title: 'Test', path: 'docs' };

      await configOpenApi(app, options);

      expect(mockConfigScalar).toHaveBeenCalledWith(app, options);
    });

    it('should pass undefined when no options given', async () => {
      const { configOpenApi } = await import('./config.js');

      await configOpenApi(app);

      expect(mockConfigScalar).toHaveBeenCalledWith(app, undefined);
    });
  });

  describe('when @scalar/nestjs-api-reference is not available', () => {
    beforeEach(() => {
      jest.resetModules();
      jest.doMock('@nestjs/swagger', () => ({}));
      jest.doMock('@scalar/nestjs-api-reference', () => {
        throw new Error('MODULE_NOT_FOUND');
      });
      jest.doMock('./scalar.config', () => ({ configScalarApiDoc: mockConfigScalar }));
      jest.doMock('./swagger.config', () => ({ configSwagger: mockConfigSwagger }));
    });

    it('should fallback to configSwagger', async () => {
      const { configOpenApi } = await import('./config.js');

      await configOpenApi(app);

      expect(mockConfigSwagger).toHaveBeenCalledTimes(1);
      expect(mockConfigScalar).not.toHaveBeenCalled();
    });

    it('should pass options to configSwagger', async () => {
      const { configOpenApi } = await import('./config.js');
      const options = { title: 'Test', path: 'docs' };

      await configOpenApi(app, options);

      expect(mockConfigSwagger).toHaveBeenCalledWith(app, options);
    });
  });
});
