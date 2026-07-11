import type { DocumentBuilder } from '@nestjs/swagger';
import type { SecurityMethod } from './options';

const PRESET_DEFAULTS: Record<string, Record<string, unknown>> = {
  bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
  basic: { type: 'http', scheme: 'basic' },
  oauth2: { type: 'oauth2', flows: {} },
  apikey: { type: 'apiKey', in: 'header' },
  cookie: { type: 'apiKey', in: 'cookie' },
};

/**
 * Apply security methods to a `DocumentBuilder` instance.
 *
 * When `methods` is `undefined`, defaults to `addBearerAuth()`.
 * When `methods` is an empty array, no security schemes are added.
 *
 * @param builder - The `DocumentBuilder` to configure.
 * @param methods - Security method descriptors to apply.
 */
export function applySecurityMethods(builder: DocumentBuilder, methods?: SecurityMethod[]): void {
  if (methods === undefined) {
    builder.addBearerAuth();
    return;
  }

  for (const { name, preset, options } of methods) {
    const defaults = preset ? PRESET_DEFAULTS[preset] : undefined;
    builder.addSecurity(name, { ...defaults, ...options } as never);
  }
}
