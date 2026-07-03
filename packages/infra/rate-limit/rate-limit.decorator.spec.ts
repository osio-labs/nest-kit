import 'reflect-metadata';
import { METADATA_RATE_LIMIT } from './rate-limit.constants';
import { RateLimit } from './rate-limit.decorator';

describe('@RateLimit decorator', () => {
  it('should set metadata with options', () => {
    const options = { limit: 10, windowSeconds: 60 };
    const decorator = RateLimit(options);
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

    const meta = Reflect.getMetadata(METADATA_RATE_LIMIT, handler);
    expect(meta).toEqual(options);
  });
});
