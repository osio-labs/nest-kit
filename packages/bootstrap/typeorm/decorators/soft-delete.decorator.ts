import { DeleteDateColumn } from 'typeorm';

/**
 * Entity decorator that adds a soft-delete `deletedAt` column.
 *
 * Instead of manually writing on every entity:
 * ```ts
 * @DeleteDateColumn({ name: 'deleted_at' })
 * deletedAt: Date | null;
 * ```
 *
 * You write one class decorator:
 * ```ts
 * @SoftDelete()
 * class Product {}
 * ```
 *
 * The column is always named `deletedAt` / `deleted_at`
 * and follows the TypeORM soft-delete convention
 * (`@DeleteDateColumn`), making it work with
 * `.find()` / `.findOne()` / `.remove()` out of the box.
 */
export function SoftDelete(): ClassDecorator {
  return (target) => {
    const proto = target.prototype as Record<string, unknown>;
    DeleteDateColumn({ name: 'deleted_at' })(proto, 'deletedAt');
  };
}
