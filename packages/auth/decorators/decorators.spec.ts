import 'reflect-metadata';
import { CurrentUser } from './current-user.decorator.js';
import { Public } from './public.decorator.js';
import { METADATA_PUBLIC } from '../auth.constants.js';

describe('CurrentUser', () => {
  it('should be defined as a decorator factory', () => {
    const decorator = CurrentUser();
    expect(typeof decorator).toBe('function');
  });
});

describe('Public', () => {
  it('should set metadata to true on method', () => {
    const decorator = Public();
    const handler = () => {};
    const target = {};
    const propertyKey = 'testMethod';
    const descriptor: PropertyDescriptor = {
      value: handler,
      writable: true,
      enumerable: true,
      configurable: true,
    };
    Object.defineProperty(target, propertyKey, descriptor);

    decorator(target, propertyKey, descriptor);

    // SetMetadata stores on descriptor.value
    const metadata = Reflect.getMetadata(METADATA_PUBLIC, handler);
    expect(metadata).toBe(true);
  });

  it('should also work as class decorator', () => {
    const decorator = Public();

    @decorator
    class TestController {}

    const metadata = Reflect.getMetadata(METADATA_PUBLIC, TestController);
    expect(metadata).toBe(true);
  });
});
