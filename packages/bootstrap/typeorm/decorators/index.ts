export type { HalfUniqueOptions } from './half-unique.decorator';
export type { MoneyOptions } from './money.decorator';
export type { SlugOptions } from './slug.decorator';
export type { UniqueCodeOptions } from './unique-code.decorator';
export type { SequenceIdOptions } from './sequence-id.decorator';
export type { EmailOptions } from './email.decorator';
export type { PhoneOptions } from './phone.decorator';
export type { UrlOptions } from './url.decorator';
export type { TextOptions } from './text.decorator';
export type { JsonOptions } from './json.decorator';
export type { BooleanOptions } from './boolean.decorator';
export type { TimestampOptions } from './timestamp.decorator';

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
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const em = require('./email.decorator') as Record<string, unknown>;
  Object.assign(_deco, em);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ph = require('./phone.decorator') as Record<string, unknown>;
  Object.assign(_deco, ph);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ur = require('./url.decorator') as Record<string, unknown>;
  Object.assign(_deco, ur);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const tx = require('./text.decorator') as Record<string, unknown>;
  Object.assign(_deco, tx);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const js = require('./json.decorator') as Record<string, unknown>;
  Object.assign(_deco, js);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const bl = require('./boolean.decorator') as Record<string, unknown>;
  Object.assign(_deco, bl);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ts = require('./timestamp.decorator') as Record<string, unknown>;
  Object.assign(_deco, ts);
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

export const Email = _deco.Email as (typeof import('./email.decorator'))['Email'];

export const Phone = _deco.Phone as (typeof import('./phone.decorator'))['Phone'];

export const Url = _deco.Url as (typeof import('./url.decorator'))['Url'];

export const Text = _deco.Text as (typeof import('./text.decorator'))['Text'];

export const Json = _deco.Json as (typeof import('./json.decorator'))['Json'];

export const Boolean = _deco.Boolean as (typeof import('./boolean.decorator'))['Boolean'];

export const CreatedAt = _deco.CreatedAt as (typeof import('./timestamp.decorator'))['CreatedAt'];

export const UpdatedAt = _deco.UpdatedAt as (typeof import('./timestamp.decorator'))['UpdatedAt'];

export const DeletedAt = _deco.DeletedAt as (typeof import('./timestamp.decorator'))['DeletedAt'];

/* DataSource registry — no typeorm dependency needed */
export { useDataSource } from './registry';
