import { resolveExample } from './api-property.decorator';

const mockApiParam = jest.fn().mockReturnValue(jest.fn());
const mockApiQuery = jest.fn().mockReturnValue(jest.fn());
const mockApiBody = jest.fn().mockReturnValue(jest.fn());
const mockApiProperty = jest.fn().mockReturnValue(jest.fn());

jest.mock('@nestjs/swagger', () => ({
  ApiParam: mockApiParam,
  ApiQuery: mockApiQuery,
  ApiBody: mockApiBody,
  ApiProperty: mockApiProperty,
}));

import { ApiParam, ApiQuery, ApiBody, ApiProperty } from './api-property.decorator';

beforeEach(() => {
  jest.clearAllMocks();
});

// ── resolveExample ─────────────────────────────────────────────

describe('resolveExample', () => {
  describe('string types', () => {
    it('should return "string" for String with no format', () => {
      expect(resolveExample(String)).toBe('string');
    });

    it('should return UUID for format "uuid"', () => {
      expect(resolveExample(String, 'uuid')).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should return email for format "email"', () => {
      expect(resolveExample(String, 'email')).toBe('user@example.com');
    });

    it('should return date string for format "date"', () => {
      expect(resolveExample(String, 'date')).toBe('2024-01-15');
    });

    it('should return ISO datetime for format "date-time"', () => {
      expect(resolveExample(String, 'date-time')).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should return URL for format "uri"', () => {
      expect(resolveExample(String, 'uri')).toBe('https://example.com');
    });

    it('should return URL for format "url"', () => {
      expect(resolveExample(String, 'url')).toBe('https://example.com');
    });

    it('should return IPv4 for format "ipv4"', () => {
      expect(resolveExample(String, 'ipv4')).toBe('192.168.1.1');
    });

    it('should return IPv6 for format "ipv6"', () => {
      expect(resolveExample(String, 'ipv6')).toBe('2001:db8::1');
    });

    it('should return hostname for format "hostname"', () => {
      expect(resolveExample(String, 'hostname')).toBe('example.com');
    });

    it('should return password for format "password"', () => {
      expect(resolveExample(String, 'password')).toBe('********');
    });

    it('should return base64 for format "binary"', () => {
      expect(resolveExample(String, 'binary')).toBe('SGVsbG8sIFdvcmxkIQ==');
    });

    it('should return phone for format "phone"', () => {
      expect(resolveExample(String, 'phone')).toBe('+1-234-567-8900');
    });

    it('should return "string" for unrecognized string format', () => {
      expect(resolveExample(String, 'custom-format')).toBe('string');
    });
  });

  describe('number types', () => {
    it('should return 1 for Number with no format', () => {
      expect(resolveExample(Number)).toBe(1);
    });

    it('should return 1 for format "int32"', () => {
      expect(resolveExample(Number, 'int32')).toBe(1);
    });

    it('should return 1.5 for format "float"', () => {
      expect(resolveExample(Number, 'float')).toBe(1.5);
    });

    it('should return 1.5 for format "double"', () => {
      expect(resolveExample(Number, 'double')).toBe(1.5);
    });

    it('should return formatted money for format "money"', () => {
      expect(resolveExample(Number, 'money')).toBe('1,234.56');
    });

    it('should return formatted money for format "decimal"', () => {
      expect(resolveExample(Number, 'decimal')).toBe('1,234.56');
    });

    it('should return currency code for format "currency"', () => {
      expect(resolveExample(Number, 'currency')).toBe('USD');
    });

    it('should return 75.5 for format "percentage"', () => {
      expect(resolveExample(Number, 'percentage')).toBe(75.5);
    });
  });

  describe('boolean types', () => {
    it('should return true for Boolean with no format', () => {
      expect(resolveExample(Boolean)).toBe(true);
    });
  });

  describe('string-literal types', () => {
    it('should handle "string" type literal', () => {
      expect(resolveExample('string')).toBe('string');
    });

    it('should handle "number" type literal', () => {
      expect(resolveExample('number')).toBe(1);
    });

    it('should handle "boolean" type literal', () => {
      expect(resolveExample('boolean')).toBe(true);
    });
  });

  describe('format priority', () => {
    it('should use format example over type default for money', () => {
      expect(resolveExample(String, 'money')).toBe('1,234.56');
    });

    it('should use format example over type default for uuid', () => {
      expect(resolveExample(Number, 'uuid')).toBe('550e8400-e29b-41d4-a716-446655440000');
    });
  });

  describe('edge cases', () => {
    it('should return undefined for undefined type', () => {
      expect(resolveExample(undefined)).toBeUndefined();
    });

    it('should return undefined for unknown class type', () => {
      class CustomEntity {}
      expect(resolveExample(CustomEntity)).toBeUndefined();
    });
  });
});

// ── ApiParam ───────────────────────────────────────────────────

describe('ApiParam', () => {
  it('should pass auto-generated example for uuid', () => {
    class TestController {
      findOne() {}
    }

    ApiParam({ name: 'id', type: String, format: 'uuid' })(
      TestController.prototype,
      'findOne',
      Object.getOwnPropertyDescriptor(TestController.prototype, 'findOne')!,
    );

    expect(mockApiParam).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'id',
        example: '550e8400-e29b-41d4-a716-446655440000',
      }),
    );
  });

  it('should pass auto-generated example for Number', () => {
    class TestController {
      findOne() {}
    }

    ApiParam({ name: 'page', type: Number })(
      TestController.prototype,
      'findOne',
      Object.getOwnPropertyDescriptor(TestController.prototype, 'findOne')!,
    );

    expect(mockApiParam).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'page',
        example: 1,
      }),
    );
  });

  it('should use explicit example over auto-generated', () => {
    class TestController {
      findOne() {}
    }

    ApiParam({ name: 'id', type: String, format: 'uuid', example: 'custom-id' })(
      TestController.prototype,
      'findOne',
      Object.getOwnPropertyDescriptor(TestController.prototype, 'findOne')!,
    );

    expect(mockApiParam).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'id',
        example: 'custom-id',
      }),
    );
  });
});

// ── ApiQuery ───────────────────────────────────────────────────

describe('ApiQuery', () => {
  it('should pass auto-generated example for email', () => {
    class TestController {
      findAll() {}
    }

    ApiQuery({ name: 'email', type: String, format: 'email' })(
      TestController.prototype,
      'findAll',
      Object.getOwnPropertyDescriptor(TestController.prototype, 'findAll')!,
    );

    expect(mockApiQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'email',
        example: 'user@example.com',
      }),
    );
  });

  it('should pass auto-generated example for Number', () => {
    class TestController {
      findAll() {}
    }

    ApiQuery({ name: 'page', type: Number })(
      TestController.prototype,
      'findAll',
      Object.getOwnPropertyDescriptor(TestController.prototype, 'findAll')!,
    );

    expect(mockApiQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'page',
        example: 1,
      }),
    );
  });
});

// ── ApiProperty ────────────────────────────────────────────────

describe('ApiProperty', () => {
  it('should pass auto-generated example and required: false', () => {
    class TestDto {
      email!: string;
    }

    ApiProperty({ type: String, format: 'email' })(TestDto.prototype, 'email');

    expect(mockApiProperty).toHaveBeenCalledWith(
      expect.objectContaining({
        type: String,
        format: 'email',
        example: 'user@example.com',
        required: false,
      }),
    );
  });

  it('should pass auto-generated example for uuid', () => {
    class TestDto {
      id!: string;
    }

    ApiProperty({ type: String, format: 'uuid' })(TestDto.prototype, 'id');

    expect(mockApiProperty).toHaveBeenCalledWith(
      expect.objectContaining({
        example: '550e8400-e29b-41d4-a716-446655440000',
        required: false,
      }),
    );
  });

  it('should pass auto-generated example for money', () => {
    class TestDto {
      amount!: string;
    }

    ApiProperty({ type: Number, format: 'money' })(TestDto.prototype, 'amount');

    expect(mockApiProperty).toHaveBeenCalledWith(
      expect.objectContaining({
        example: '1,234.56',
        required: false,
      }),
    );
  });

  it('should use explicit example over auto-generated', () => {
    class TestDto {
      name!: string;
    }

    ApiProperty({ type: String, example: 'John' })(TestDto.prototype, 'name');

    expect(mockApiProperty).toHaveBeenCalledWith(
      expect.objectContaining({
        example: 'John',
        required: false,
      }),
    );
  });

  it('should work with no options', () => {
    class TestDto {
      name!: string;
    }

    ApiProperty()(TestDto.prototype, 'name');

    expect(mockApiProperty).toHaveBeenCalledWith(
      expect.objectContaining({
        required: false,
      }),
    );
  });
});

// ── ApiBody ────────────────────────────────────────────────────

describe('ApiBody', () => {
  it('should pass through options to @nestjs/swagger', () => {
    class TestController {
      create() {}
    }

    ApiBody({ type: Object, description: 'Create user' })(
      TestController.prototype,
      'create',
      Object.getOwnPropertyDescriptor(TestController.prototype, 'create')!,
    );

    expect(mockApiBody).toHaveBeenCalledWith({
      type: Object,
      description: 'Create user',
    });
  });
});

// ── Graceful degradation ──────────────────────────────────────

describe('when @nestjs/swagger is not installed', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock('@nestjs/swagger', () => {
      throw new Error('MODULE_NOT_FOUND');
    });
  });

  it('should not throw when ApiParam is used', async () => {
    const { ApiParam: LocalApiParam } = await import('./api-property.decorator');

    expect(() => {
      class TestController {
        findOne() {}
      }

      LocalApiParam({ name: 'id', type: String })(
        TestController.prototype,
        'findOne',
        Object.getOwnPropertyDescriptor(TestController.prototype, 'findOne')!,
      );
    }).not.toThrow();
  });

  it('should not throw when ApiProperty is used', async () => {
    const { ApiProperty: LocalApiProperty } = await import('./api-property.decorator');

    expect(() => {
      class TestDto {
        name!: string;
      }

      LocalApiProperty({ type: String })(TestDto.prototype, 'name');
    }).not.toThrow();
  });
});
