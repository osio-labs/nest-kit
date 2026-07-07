/**
 * Configuration options for global validation.
 */
export interface ValidationConfigOptions {
  /** Enable transformation. Defaults to `true`. */
  transform?: boolean;
  /** Enable implicit conversion. Defaults to `true`. */
  enableImplicitConversion?: boolean;
  /** Strip non-whitelisted properties. Defaults to `true`. */
  whitelist?: boolean;
  /** Throw on non-whitelisted properties. Defaults to `true`. */
  forbidNonWhitelisted?: boolean;
  /** Show detailed error messages (standard pipe). Defaults to `true`. */
  detailedErrors?: boolean;
}

export const defaultOptions: ValidationConfigOptions = {
  transform: true,
  enableImplicitConversion: true,
  whitelist: true,
  forbidNonWhitelisted: true,
  detailedErrors: true,
};

export function buildPipeOptions(opts: ValidationConfigOptions): Record<string, unknown> {
  return {
    transform: opts.transform,
    transformOptions: { enableImplicitConversion: opts.enableImplicitConversion },
    whitelist: opts.whitelist,
    forbidNonWhitelisted: opts.forbidNonWhitelisted,
  };
}
