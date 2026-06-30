import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import type { CrudService } from './service';

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
