export type { HalfUniqueOptions } from './half-unique.decorator';
export type { MoneyOptions } from './money.decorator';
export type { SlugOptions } from './slug.decorator';
export type { UniqueCodeOptions } from './unique-code.decorator';
export type { SequenceIdOptions } from './sequence-id.decorator';

let _deco: Record<string, unknown> = {};
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('typeorm');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  _deco = require('./half-unique.decorator') as Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sd = require('./soft-delete.decorator') as Record<string, unknown>;
  Object.assign(_deco, sd);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const md = require('./money.decorator') as Record<string, unknown>;
  Object.assign(_deco, md);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sl = require('./slug.decorator') as Record<string, unknown>;
  Object.assign(_deco, sl);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const uc = require('./unique-code.decorator') as Record<string, unknown>;
  Object.assign(_deco, uc);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sq = require('./sequence-id.decorator') as Record<string, unknown>;
  Object.assign(_deco, sq);
} catch {
  /* typeorm not installed — decorators will be undefined */
}

export const HalfUnique =
  _deco.HalfUnique as (typeof import('./half-unique.decorator'))['HalfUnique'];

export const SoftDelete =
  _deco.SoftDelete as (typeof import('./soft-delete.decorator'))['SoftDelete'];

export const Money = _deco.Money as (typeof import('./money.decorator'))['Money'];

export const Slug = _deco.Slug as (typeof import('./slug.decorator'))['Slug'];

export const UniqueCode =
  _deco.UniqueCode as (typeof import('./unique-code.decorator'))['UniqueCode'];

export const SequenceId =
  _deco.SequenceId as (typeof import('./sequence-id.decorator'))['SequenceId'];

/* DataSource registry — no typeorm dependency needed */
export { useDataSource } from './registry';
