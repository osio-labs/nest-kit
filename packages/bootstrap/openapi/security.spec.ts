import type { DocumentBuilder } from '@nestjs/swagger';

import { applySecurityMethods } from './security';

describe('applySecurityMethods', () => {
  let builder: jest.Mocked<DocumentBuilder>;

  beforeEach(() => {
    builder = {
      addBearerAuth: jest.fn().mockReturnThis(),
      addSecurity: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<DocumentBuilder>;
  });

  it('should call addBearerAuth when methods is undefined', () => {
    applySecurityMethods(builder);

    expect(builder.addBearerAuth).toHaveBeenCalledTimes(1);
    expect(builder.addSecurity).not.toHaveBeenCalled();
  });

  it('should call nothing when methods is an empty array', () => {
    applySecurityMethods(builder, []);

    expect(builder.addBearerAuth).not.toHaveBeenCalled();
    expect(builder.addSecurity).not.toHaveBeenCalled();
  });

  it('should call addSecurity with bearer preset defaults', () => {
    applySecurityMethods(builder, [{ name: 'bearer', preset: 'bearer' }]);

    expect(builder.addSecurity).toHaveBeenCalledWith('bearer', {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    });
  });

  it('should call addSecurity with basic preset defaults', () => {
    applySecurityMethods(builder, [{ name: 'basic', preset: 'basic' }]);

    expect(builder.addSecurity).toHaveBeenCalledWith('basic', {
      type: 'http',
      scheme: 'basic',
    });
  });

  it('should call addSecurity with oauth2 preset defaults', () => {
    applySecurityMethods(builder, [{ name: 'oauth2', preset: 'oauth2' }]);

    expect(builder.addSecurity).toHaveBeenCalledWith('oauth2', {
      type: 'oauth2',
      flows: {},
    });
  });

  it('should call addSecurity with apikey preset defaults', () => {
    applySecurityMethods(builder, [{ name: 'api_key', preset: 'apikey' }]);

    expect(builder.addSecurity).toHaveBeenCalledWith('api_key', {
      type: 'apiKey',
      in: 'header',
    });
  });

  it('should call addSecurity with cookie preset defaults', () => {
    applySecurityMethods(builder, [{ name: 'cookie', preset: 'cookie' }]);

    expect(builder.addSecurity).toHaveBeenCalledWith('cookie', {
      type: 'apiKey',
      in: 'cookie',
    });
  });

  it('should merge options on top of preset defaults', () => {
    applySecurityMethods(builder, [
      {
        name: 'jwt',
        preset: 'bearer',
        options: { bearerFormat: 'Token' },
      },
    ]);

    expect(builder.addSecurity).toHaveBeenCalledWith('jwt', {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'Token',
    });
  });

  it('should call addSecurity with custom options when no preset', () => {
    applySecurityMethods(builder, [
      { name: 'digest', options: { type: 'http', scheme: 'digest' } },
    ]);

    expect(builder.addSecurity).toHaveBeenCalledWith('digest', {
      type: 'http',
      scheme: 'digest',
    });
  });

  it('should handle multiple security methods', () => {
    applySecurityMethods(builder, [
      { name: 'bearer', preset: 'bearer' },
      { name: 'api_key', preset: 'apikey' },
      { name: 'custom', options: { type: 'http', scheme: 'digest' } },
    ]);

    expect(builder.addSecurity).toHaveBeenCalledTimes(3);
    expect(builder.addSecurity).toHaveBeenNthCalledWith(1, 'bearer', {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    });
    expect(builder.addSecurity).toHaveBeenNthCalledWith(2, 'api_key', {
      type: 'apiKey',
      in: 'header',
    });
    expect(builder.addSecurity).toHaveBeenNthCalledWith(3, 'custom', {
      type: 'http',
      scheme: 'digest',
    });
  });
});
