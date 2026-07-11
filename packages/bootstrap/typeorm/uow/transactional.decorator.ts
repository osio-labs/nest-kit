import { AsyncLocalStorage } from 'async_hooks';
import type { DataSource } from 'typeorm';
import { UnitOfWork } from './unit-of-work.js';

const uowStorage = new AsyncLocalStorage<UnitOfWork>();

function createUowWrapper(originalMethod: (...args: unknown[]) => unknown, dataSourceProp: string) {
  return async function (this: Record<string, unknown>, ...args: unknown[]): Promise<unknown> {
    const dataSource = this[dataSourceProp] as DataSource | undefined;

    if (!dataSource) {
      throw new Error(
        `@Transactional() requires a DataSource at this.${dataSourceProp}. ` +
          `Inject via constructor: constructor(private ${dataSourceProp}: DataSource) {}`,
      );
    }

    const uow = new UnitOfWork(dataSource);
    await uow.start();

    try {
      const result = await uowStorage.run(uow, () => originalMethod.apply(this, args));
      await uow.commit();
      return result;
    } catch (error) {
      try {
        await uow.rollback();
      } catch {
        // rollback failure — discard, original error takes precedence
      }
      throw error;
    } finally {
      await uow.release();
    }
  };
}

/**
 * Returns the current `UnitOfWork` active inside a `@Transactional()` /
 * `@TransactionalController()` method.
 *
 * Must be called from within a method decorated with `@Transactional()` or a
 * class decorated with `@TransactionalController()`.
 */
export function getCurrentUnitOfWork(): UnitOfWork | undefined {
  return uowStorage.getStore();
}

/**
 * Wraps a controller / service method in a database transaction.
 *
 * @param dataSourceProp - Name of the class property holding the `DataSource`
 *                         (default: `'dataSource'`).
 *
 * @example
 * ```ts
 * \@Injectable()
 * class UsersService {
 *   constructor(private dataSource: DataSource) {}
 *
 *   \@Transactional()
 *   async create(data: CreateUserDto): Promise<User> {
 *     const uow = getCurrentUnitOfWork();
 *     const repo = uow.getRepository(User);
 *     return repo.save(data);
 *   }
 * }
 * ```
 */
export function Transactional(dataSourceProp: string = 'dataSource'): MethodDecorator {
  return (_target: object, _propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value as (...args: unknown[]) => unknown;
    descriptor.value = createUowWrapper(originalMethod, dataSourceProp);
    return descriptor;
  };
}

/**
 * Class-level decorator that wraps every method of the controller in a
 * database transaction.
 *
 * @param dataSourceProp - Name of the class property holding the `DataSource`
 *                         (default: `'dataSource'`).
 *
 * @example
 * ```ts
 * \@Controller('users')
 * \@TransactionalController()
 * export class UsersController {
 *   constructor(\@InjectDataSource() private readonly dataSource: DataSource) {}
 *
 *   \@Post()
 *   async create(\@Body() data: CreateUserDto) {
 *     const uow = getCurrentUnitOfWork();
 *     const repo = uow.getRepository(User);
 *     return repo.save(data);
 *   }
 *
 *   \@Get()
 *   async findAll() {
 *     const uow = getCurrentUnitOfWork();
 *     return uow.getRepository(User).find();
 *   }
 * }
 * ```
 */
export function TransactionalController(dataSourceProp: string = 'dataSource'): ClassDecorator {
  return (target: object) => {
    const ctor = target as { prototype: Record<string, unknown> };
    const proto = ctor.prototype;
    const methodNames = Object.getOwnPropertyNames(proto).filter(
      (name) => name !== 'constructor' && typeof proto[name] === 'function',
    );

    for (const methodName of methodNames) {
      const descriptor = Object.getOwnPropertyDescriptor(proto, methodName);
      if (!descriptor?.value) continue;

      const originalMethod = descriptor.value as (...args: unknown[]) => unknown;
      descriptor.value = createUowWrapper(originalMethod, dataSourceProp);
      Object.defineProperty(proto, methodName, descriptor);
    }
  };
}
