import type { ConfigService } from '@nestjs/config';

export type Getter = {
  str: (key: string) => string | undefined;
  num: (key: string) => number | undefined;
  bool: (key: string, def: boolean) => boolean;
};

/**
 * Wrap a `buildFn(get, options?)` into a ready-to-export config function
 * with the standard `(options?, configService?) => TResult` signature.
 *
 * When `configService` is provided, the `get` reader reads from it
 * (which internally may read `process.env` by default).
 * Otherwise reads directly from `process.env`.
 *
 * @example
 * ```ts
 * export const configTypeOrm = withConfig<TypeOrmConfigOptions, TypeOrmModuleOptions>(buildConfig);
 * ```
 */
export function withConfig<TOptions, TResult>(
  buildFn: (get: Getter, options?: TOptions) => TResult,
): (options?: TOptions, configService?: ConfigService) => TResult {
  return (options, configService) =>
    buildFn(
      configService
        ? {
            str: (key) => configService.get<string>(key),
            num: (key) => configService.get<number>(key),
            bool: (key, def) => configService.get<boolean>(key) ?? def,
          }
        : {
            str: (key) => process.env[key],
            num: (key) => (process.env[key] !== undefined ? Number(process.env[key]) : undefined),
            bool: (key, def) =>
              process.env[key] !== undefined
                ? process.env[key] === 'true' || process.env[key] === '1'
                : def,
          },
      options,
    );
}
