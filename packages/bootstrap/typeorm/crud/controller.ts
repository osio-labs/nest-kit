import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import type { CrudService } from './service';

/**
 * Creates a NestJS controller class with standard CRUD endpoints.
 *
 * Instead of manually writing 5 route handlers with `@Get()`, `@Post()`,
 * `@Patch()`, `@Delete()`, `@Param()`, `@Body()`:
 *
 * ```ts
 * @Controller('products')
 * class ProductController {
 *   constructor(private readonly service: ProductService) {}
 *
 *   @Get()
 *   findAll() { return this.service.findAll(); }
 *   // ... 4 more handlers
 * }
 * ```
 *
 * You write:
 * ```ts
 * const ProductController = createCrudController(productService, { path: 'products' });
 * ```
 *
 * The returned class has `findAll` (GET /), `findOne` (GET /:id),
 * `create` (POST /), `update` (PATCH /:id), and `remove` (DELETE /:id).
 *
 * @param service - A {@link CrudService} instance.
 * @param options - Optional `{ path }` for the route prefix.
 */
export function createCrudController<T>(service: CrudService<T>, options?: { path?: string }) {
  @Controller(options?.path ?? '')
  class CrudController {
    @Get()
    findAll() {
      return service.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
      return service.findOne(id);
    }

    @Post()
    create(@Body() data: Record<string, unknown>) {
      return service.create(data as unknown as Partial<T>);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() data: Record<string, unknown>) {
      return service.update(id, data as unknown as Partial<T>);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
      return service.remove(id);
    }
  }

  return CrudController;
}
