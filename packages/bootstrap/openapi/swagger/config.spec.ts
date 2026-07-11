import type { INestApplication } from '@nestjs/common';

const mockSetTitle = jest.fn().mockReturnThis();
const mockSetDescription = jest.fn().mockReturnThis();
const mockSetVersion = jest.fn().mockReturnThis();
const mockAddBearerAuth = jest.fn().mockReturnThis();
const mockAddSecurity = jest.fn().mockReturnThis();
const mockBuild = jest.fn().mockReturnValue({});

const mockCreateDocument = jest.fn().mockReturnValue({});
const mockSetup = jest.fn();

jest.mock('@nestjs/swagger', () => ({
  DocumentBuilder: jest.fn().mockImplementation(() => ({
    setTitle: mockSetTitle,
    setDescription: mockSetDescription,
    setVersion: mockSetVersion,
    addBearerAuth: mockAddBearerAuth,
    addSecurity: mockAddSecurity,
    build: mockBuild,
  })),
  SwaggerModule: {
    createDocument: mockCreateDocument,
    setup: mockSetup,
  },
}));

import type { configSwagger as ConfigSwaggerFn } from './config.js';

let configSwagger: typeof ConfigSwaggerFn;

beforeAll(() => {
  const mod = jest.requireActual('./config') as unknown as {
    configSwagger: typeof ConfigSwaggerFn;
  };
  configSwagger = mod.configSwagger;
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('configSwagger', () => {
  let app: INestApplication;

  beforeEach(() => {
    app = { use: jest.fn() } as unknown as INestApplication;
  });

  it('should use default options when none provided', () => {
    configSwagger(app);

    expect(mockSetTitle).toHaveBeenCalledWith('NestJS API');
    expect(mockSetDescription).toHaveBeenCalledWith('');
    expect(mockSetVersion).toHaveBeenCalledWith('1.0');
    expect(mockAddBearerAuth).toHaveBeenCalledTimes(1);

    expect(mockCreateDocument).toHaveBeenCalledWith(app, {}, undefined);
    expect(mockSetup).toHaveBeenCalledWith(
      'api/docs',
      app,
      {},
      expect.objectContaining({
        customfavIcon: 'https://scalar.com/favicon.svg',
        swaggerOptions: { persistAuthorization: true },
      }),
    );
  });

  it('should use defaults when empty options object', () => {
    configSwagger(app, {});

    expect(mockSetTitle).toHaveBeenCalledWith('NestJS API');
    expect(mockSetDescription).toHaveBeenCalledWith('');
    expect(mockSetVersion).toHaveBeenCalledWith('1.0');
    expect(mockAddBearerAuth).toHaveBeenCalledTimes(1);
    expect(mockSetup).toHaveBeenCalledWith(
      'api/docs',
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ customfavIcon: 'https://scalar.com/favicon.svg' }),
    );
  });

  it('should use custom title, description, and version', () => {
    configSwagger(app, {
      title: 'My API',
      description: 'My description',
      version: '2.0',
    });

    expect(mockSetTitle).toHaveBeenCalledWith('My API');
    expect(mockSetDescription).toHaveBeenCalledWith('My description');
    expect(mockSetVersion).toHaveBeenCalledWith('2.0');
  });

  it('should use custom path', () => {
    configSwagger(app, { path: 'custom/docs' });

    expect(mockSetup).toHaveBeenCalledWith(
      'custom/docs',
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  it('should pass swaggerDocumentOptions to createDocument', () => {
    configSwagger(app, {
      swaggerDocumentOptions: { ignoreGlobalPrefix: true },
    });

    expect(mockCreateDocument).toHaveBeenCalledWith(app, {}, { ignoreGlobalPrefix: true });
  });

  it('should pass undefined swaggerDocumentOptions when not set', () => {
    configSwagger(app, {});

    expect(mockCreateDocument).toHaveBeenCalledWith(app, {}, undefined);
  });

  it('should use custom favicon from swaggerCustomOptions', () => {
    configSwagger(app, {
      swaggerCustomOptions: { customfavIcon: 'https://example.com/favicon.ico' },
    });

    expect(mockSetup).toHaveBeenCalledWith(
      expect.any(String),
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ customfavIcon: 'https://example.com/favicon.ico' }),
    );
  });

  it('should set persistAuthorization default and merge swaggerOptions', () => {
    configSwagger(app, {
      swaggerCustomOptions: { swaggerOptions: { docExpansion: 'none' } },
    });

    expect(mockSetup).toHaveBeenCalledWith(
      expect.any(String),
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        swaggerOptions: { persistAuthorization: true, docExpansion: 'none' },
      }),
    );
  });

  it('should allow overriding persistAuthorization', () => {
    configSwagger(app, {
      swaggerCustomOptions: { swaggerOptions: { persistAuthorization: false } },
    });

    expect(mockSetup).toHaveBeenCalledWith(
      expect.any(String),
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        swaggerOptions: { persistAuthorization: false },
      }),
    );
  });

  it('should merge swaggerCustomOptions at the top level', () => {
    configSwagger(app, {
      swaggerCustomOptions: { explorer: true },
    });

    expect(mockSetup).toHaveBeenCalledWith(
      expect.any(String),
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        customfavIcon: 'https://scalar.com/favicon.svg',
        explorer: true,
        swaggerOptions: { persistAuthorization: true },
      }),
    );
  });

  it('should call addBearerAuth by default when securityMethods not set', () => {
    configSwagger(app);

    expect(mockAddBearerAuth).toHaveBeenCalledTimes(1);
    expect(mockAddSecurity).not.toHaveBeenCalled();
  });

  it('should call addSecurity with preset when securityMethods provided', () => {
    configSwagger(app, {
      securityMethods: [{ name: 'bearer', preset: 'bearer' }],
    });

    expect(mockAddBearerAuth).not.toHaveBeenCalled();
    expect(mockAddSecurity).toHaveBeenCalledWith('bearer', {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    });
  });

  it('should call addSecurity for each securityMethod', () => {
    configSwagger(app, {
      securityMethods: [
        { name: 'bearer', preset: 'bearer' },
        { name: 'api_key', preset: 'apikey' },
      ],
    });

    expect(mockAddSecurity).toHaveBeenCalledTimes(2);
  });

  it('should skip addBearerAuth when securityMethods is empty array', () => {
    configSwagger(app, { securityMethods: [] });

    expect(mockAddBearerAuth).not.toHaveBeenCalled();
    expect(mockAddSecurity).not.toHaveBeenCalled();
  });
});
