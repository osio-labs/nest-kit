import type { INestApplication } from '@nestjs/common';

const mockSetTitle = jest.fn().mockReturnThis();
const mockSetDescription = jest.fn().mockReturnThis();
const mockSetVersion = jest.fn().mockReturnThis();
const mockAddBearerAuth = jest.fn().mockReturnThis();
const mockBuild = jest.fn().mockReturnValue({});

const mockCreateDocument = jest.fn().mockReturnValue({});

const mockApiReference = jest.fn(() => 'middleware');

jest.mock('@nestjs/swagger', () => ({
  DocumentBuilder: jest.fn().mockImplementation(() => ({
    setTitle: mockSetTitle,
    setDescription: mockSetDescription,
    setVersion: mockSetVersion,
    addBearerAuth: mockAddBearerAuth,
    build: mockBuild,
  })),
  SwaggerModule: {
    createDocument: mockCreateDocument,
  },
}));

jest.mock('@scalar/nestjs-api-reference', () => ({
  apiReference: mockApiReference,
}));

import type { configScalarApiDoc as ConfigScalarFn } from './config';

let configScalarApiDoc: typeof ConfigScalarFn;

beforeAll(() => {
  const mod = jest.requireActual('./config') as unknown as {
    configScalarApiDoc: typeof ConfigScalarFn;
  };
  configScalarApiDoc = mod.configScalarApiDoc;
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('configScalarApiDoc', () => {
  let app: INestApplication;
  let appUse: jest.Mock;

  beforeEach(() => {
    appUse = jest.fn();
    app = { use: appUse } as unknown as INestApplication;
  });

  it('should register scalar middleware with default path', () => {
    configScalarApiDoc(app);

    expect(appUse).toHaveBeenCalledTimes(1);
    expect(appUse).toHaveBeenCalledWith('api/docs', 'middleware');
  });

  it('should use defaults when empty options object', () => {
    configScalarApiDoc(app, {});

    expect(mockSetTitle).toHaveBeenCalledWith('NestJS API');
    expect(mockSetDescription).toHaveBeenCalledWith('');
    expect(mockSetVersion).toHaveBeenCalledWith('1.0');
    expect(mockAddBearerAuth).toHaveBeenCalledTimes(1);
    expect(mockCreateDocument).toHaveBeenCalledWith(app, {}, undefined);
    expect(appUse).toHaveBeenCalledWith('api/docs', expect.anything());
  });

  it('should register scalar middleware with custom path', () => {
    configScalarApiDoc(app, { path: 'custom/scalar' });

    expect(appUse).toHaveBeenCalledTimes(1);
    expect(appUse).toHaveBeenCalledWith('custom/scalar', 'middleware');
  });

  it('should use custom title, description, version when provided', () => {
    configScalarApiDoc(app, {
      title: 'My API',
      description: 'My desc',
      version: '2.0',
    });

    expect(mockSetTitle).toHaveBeenCalledWith('My API');
    expect(mockSetDescription).toHaveBeenCalledWith('My desc');
    expect(mockSetVersion).toHaveBeenCalledWith('2.0');
  });

  it('should pass swaggerDocumentOptions to createDocument', () => {
    configScalarApiDoc(app, {
      swaggerDocumentOptions: { deepScanRoutes: true },
    });

    expect(mockCreateDocument).toHaveBeenCalledWith(app, {}, { deepScanRoutes: true });
  });

  it('should pass undefined swaggerDocumentOptions when not set', () => {
    configScalarApiDoc(app, {});

    expect(mockCreateDocument).toHaveBeenCalledWith(app, {}, undefined);
  });

  it('should merge scalarOptions', () => {
    configScalarApiDoc(app, {
      scalarOptions: { theme: 'purple' },
    });

    expect(mockApiReference).toHaveBeenCalledWith(
      expect.objectContaining({
        spec: { content: {} },
        theme: 'purple',
      }),
    );
  });

  it('should pass empty scalarOptions when not set', () => {
    configScalarApiDoc(app, {});

    expect(mockApiReference).toHaveBeenCalledWith({
      spec: { content: {} },
    });
  });

  it('should propagate when Scalar throws', () => {
    mockApiReference.mockImplementation(() => {
      throw new Error('boom');
    });

    expect(() => configScalarApiDoc(app)).toThrow('boom');
  });
});
