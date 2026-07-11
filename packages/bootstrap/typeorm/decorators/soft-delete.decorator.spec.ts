import { DeleteDateColumn } from 'typeorm';

jest.mock('typeorm', () => {
  const actual = jest.requireActual('typeorm');

  return {
    ...actual,
    DeleteDateColumn: jest.fn().mockImplementation((...args: unknown[]) => {
      const actualModule = jest.requireActual('typeorm');
      if (typeof actualModule.DeleteDateColumn === 'function') {
        return actualModule.DeleteDateColumn(...args);
      }
      return () => {};
    }),
  };
});

import { SoftDelete } from './soft-delete.decorator.js';

const MockedDeleteDateColumn = DeleteDateColumn as jest.MockedFunction<typeof DeleteDateColumn>;

beforeEach(() => {
  MockedDeleteDateColumn.mockClear();
});

describe('@SoftDelete', () => {
  it('should call DeleteDateColumn with name:"deleted_at"', () => {
    @SoftDelete()
    class _Entity {}
    void _Entity;

    expect(MockedDeleteDateColumn).toHaveBeenCalledTimes(1);
    expect(MockedDeleteDateColumn).toHaveBeenCalledWith({ name: 'deleted_at' });
  });

  it('should set deletedAt property on prototype', () => {
    const propDecorator = jest.fn();
    (MockedDeleteDateColumn as jest.Mock).mockReturnValue(propDecorator);

    @SoftDelete()
    class _Entity2 {}
    void _Entity2;

    expect(propDecorator).toHaveBeenCalledTimes(1);
    expect(propDecorator).toHaveBeenCalledWith(_Entity2.prototype, 'deletedAt');
  });
});
