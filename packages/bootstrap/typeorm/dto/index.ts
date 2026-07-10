let _dto: Record<string, unknown> = {};
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('typeorm');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  _dto = require('./create-create-dto') as Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ud = require('./create-update-dto') as Record<string, unknown>;
  Object.assign(_dto, ud);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fd = require('./create-find-dto') as Record<string, unknown>;
  Object.assign(_dto, fd);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const bf = require('./build-find-options') as Record<string, unknown>;
  Object.assign(_dto, bf);
} catch {
  /* typeorm not installed — DTO helpers will be undefined */
}

export type { FindDto } from './create-find-dto';
export type {
  FindOptionsQuery,
  BuildFindOptionsResult,
  FilterOperator,
} from './build-find-options';

export const createCreateDto =
  _dto.createCreateDto as (typeof import('./create-create-dto'))['createCreateDto'];

export const createUpdateDto =
  _dto.createUpdateDto as (typeof import('./create-update-dto'))['createUpdateDto'];

export const createFindDto =
  _dto.createFindDto as (typeof import('./create-find-dto'))['createFindDto'];

export const buildFindOptions =
  _dto.buildFindOptions as (typeof import('./build-find-options'))['buildFindOptions'];
