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

import type { configScalarApiDoc as ConfigScalarFn } from './index';

let configScalarApiDoc: typeof ConfigScalarFn;

beforeAll(() => {
  const mod = jest.requireActual('./index') as unknown as {
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
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    appUse = jest.fn();
    app = { use: appUse } as unknown as INestApplication;
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('should register scalar middleware with default path', () => {
    configScalarApiDoc(app);

    expect(warnSpy).not.toHaveBeenCalled();
    expect(appUse).toHaveBeenCalledTimes(1);
    expect(appUse).toHaveBeenCalledWith('api/docs', 'middleware');
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

    expect(mockCreateDocument).toHaveBeenCalledWith(
      app,
      {},
      {
        deepScanRoutes: true,
      },
    );
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

  it('should log warning and skip middleware when a Scalar error occurs', () => {
    mockApiReference.mockImplementation(() => {
      throw new Error('boom');
    });

    configScalarApiDoc(app);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('@scalar/nestjs-api-reference'));
    expect(appUse).not.toHaveBeenCalled();
  });
});
