import { ConfigService } from '@nestjs/config';

/**
 * Key-value reader abstraction used internally by all bootstrap config
 * builders. Each sub-module receives one of these so it can read from
 * either `process.env` (sync) or `ConfigService` (async) without
 * duplicating the adapter logic.
 */
export interface ConfigReader {
  /** Read a string value. */
  str: (key: string) => string | undefined;
  /** Read a numeric value. */
  num: (key: string) => number | undefined;
  /** Read a boolean value with a fallback default. */
  bool: (key: string, def: boolean) => boolean;
}

/**
 * Create a {@link ConfigReader} that reads from a `ConfigService` when
 * provided, or directly from `process.env` otherwise.
 */
export function fromEnv(configService?: ConfigService): ConfigReader {
  if (configService) {
    return {
      str: (key) => configService.get<string>(key),
      num: (key) => configService.get<number>(key),
      bool: (key, def) => configService.get<boolean>(key, def) ?? def,
    };
  }

  return {
    str: (key) => process.env[key],
    num: (key) => (process.env[key] !== undefined ? Number(process.env[key]) : undefined),
    bool: (key, def) =>
      process.env[key] !== undefined
        ? process.env[key] === 'true' || process.env[key] === '1'
        : def,
  };
}
