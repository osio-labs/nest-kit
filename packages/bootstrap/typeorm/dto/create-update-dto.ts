import type { ObjectLiteral } from 'typeorm';

type Constructor<T> = new (...args: unknown[]) => T;

const SKIP_MODES = new Set(['createDate', 'updateDate', 'deleteDate', 'version']);

function getSkippedFields(entity: Constructor<ObjectLiteral>): string[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getMetadataArgsStorage } = require('typeorm') as {
      getMetadataArgsStorage: () => {
        columns: Array<{
          target: object;
          mode: string;
          propertyName: string;
          options: Record<string, unknown>;
        }>;
      };
    };
    return getMetadataArgsStorage()
      .columns.filter((c) => c.target === entity || c.target === entity.prototype)
      .filter((c) => {
        const opts = c.options ?? {};
        const mode = c.mode ?? 'regular';
        const generated = opts.generated as string | boolean | undefined;
        return (
          SKIP_MODES.has(mode) ||
          opts.primary === true ||
          opts.primary === 'true' ||
          generated === 'increment' ||
          generated === 'uuid' ||
          generated === 'rowid' ||
          generated === 'identity' ||
          generated === true
        );
      })
      .map((c) => c.propertyName);
  } catch {
    return [];
  }
}

/**
 * Creates an **Update DTO** class from a TypeORM entity via `PartialType` + `OmitType`.
 *
 * Auto-managed columns (`@PrimaryGeneratedColumn`, `@CreateDateColumn`,
 * `@UpdateDateColumn`, `@DeleteDateColumn`, `@VersionColumn`) are omitted,
 * and all remaining fields are marked optional.
 * The returned class extends the entity, inheriting all existing decorators.
 *
 * Falls back to the entity itself when `@nestjs/swagger` is not installed.
 *
 * @example
 * ```ts
 * @Entity()
 * class User {
 *   @PrimaryGeneratedColumn() id: number;
 *   @Column() name: string;
 *   @Column({ nullable: true }) email?: string;
 * }
 *
 * const UpdateUserDto = createUpdateDto(User);
 * // Swagger shows `name` and `email` as optional
 * ```
 *
 * @param entity - The TypeORM entity class.
 */
export function createUpdateDto<T extends ObjectLiteral>(
  entity: Constructor<T>,
): Constructor<Partial<T>> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { OmitType, PartialType } = require('@nestjs/swagger') as {
      OmitType: (
        classRef: Constructor<ObjectLiteral>,
        keys: readonly string[],
      ) => Constructor<ObjectLiteral>;
      PartialType: (classRef: Constructor<ObjectLiteral>) => Constructor<ObjectLiteral>;
    };
    const fields = getSkippedFields(entity);
    const base: Constructor<ObjectLiteral> = fields.length > 0 ? OmitType(entity, fields) : entity;
    return PartialType(base) as Constructor<Partial<T>>;
  } catch {
    /* @nestjs/swagger not installed */
  }
  return entity;
}
