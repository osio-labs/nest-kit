import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import type { CrudService } from './service';

/**
 * Options for the {@link CrudController} decorator.
 *
 * Instead of manually writing 5 route handlers with
 * `@Get()`, `@Post()`, `@Patch()`, `@Delete()`, `@Param()`, `@Body()`:
 *
 * You write one class decorator:
 * ```ts
 * @CrudController({ path: 'products' })
 * class ProductController {
 *   constructor(private readonly service: ProductService) {}
 * }
 * ```
 *
 * The decorator generates `findAll`, `findOne`, `create`, `update`, `remove`
 * methods that delegate to a `CrudService` injected via the constructor.
 */
export interface CrudControllerOptions {
  /** Route prefix passed to NestJS `@Controller()` (default: `''`). */
  path?: string;
}

function crudMethod<T>(fn: (service: CrudService<T>) => unknown) {
  return function (this: { service: CrudService<T> }) {
    return fn(this.service);
  };
}

/**
 * Class decorator that auto-generates standard CRUD endpoints.
 *
 * Instead of manually writing every route handler:
 * ```ts
 * @Controller('products')
 * class ProductController {
 *   constructor(private readonly service: ProductService) {}
 *
 *   @Get()
 *   findAll() { return this.service.findAll(); }
 *
 *   @Get(':id')
 *   findOne(@Param('id') id: string) { return this.service.findOne(id); }
 *
 *   @Post()
 *   create(@Body() data: unknown) { return this.service.create(data); }
 *
 *   @Patch(':id')
 *   update(@Param('id') id: string, @Body() data: unknown) { return this.service.update(id, data); }
 *
 *   @Delete(':id')
 *   remove(@Param('id') id: string) { return this.service.remove(id); }
 * }
 * ```
 *
 * You write:
 * ```ts
 * @CrudController({ path: 'products' })
 * class ProductController {
 *   constructor(private readonly service: ProductService) {}
 * }
 * ```
 *
 * Existing methods on the prototype are **not** overwritten, so you can
 * override individual handlers while keeping the ones you don't customise.
 *
 * @param options - Optional {@link CrudControllerOptions} to set the route path.
 */
export function CrudController(options?: CrudControllerOptions): ClassDecorator {
  return (target) => {
    Controller(options?.path ?? '')(target);

    const proto = (target as unknown as Record<string, unknown>).prototype as Record<
      string,
      unknown
    >;

    if (!('findAll' in proto)) {
      proto.findAll = crudMethod((s) => s.findAll());
      Get()(proto, 'findAll', Object.getOwnPropertyDescriptor(proto, 'findAll')!);
    }

    if (!('findOne' in proto)) {
      proto.findOne = function (this: { service: CrudService<unknown> }, id: string) {
        return this.service.findOne(id);
      };
      Get(':id')(proto, 'findOne', Object.getOwnPropertyDescriptor(proto, 'findOne')!);
      Param('id')(proto, 'findOne', 0);
    }

    if (!('create' in proto)) {
      proto.create = function (
        this: { service: CrudService<unknown> },
        data: Record<string, unknown>,
      ) {
        return this.service.create(data);
      };
      Post()(proto, 'create', Object.getOwnPropertyDescriptor(proto, 'create')!);
      Body()(proto, 'create', 0);
    }

    if (!('update' in proto)) {
      proto.update = function (
        this: { service: CrudService<unknown> },
        id: string,
        data: Record<string, unknown>,
      ) {
        return this.service.update(id, data);
      };
      Patch(':id')(proto, 'update', Object.getOwnPropertyDescriptor(proto, 'update')!);
      Param('id')(proto, 'update', 0);
      Body()(proto, 'update', 1);
    }

    if (!('remove' in proto)) {
      proto.remove = function (this: { service: CrudService<unknown> }, id: string) {
        return this.service.remove(id);
      };
      Delete(':id')(proto, 'remove', Object.getOwnPropertyDescriptor(proto, 'remove')!);
      Param('id')(proto, 'remove', 0);
    }
  };
}
