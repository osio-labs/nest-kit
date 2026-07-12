import { Get, Post, Patch, Delete } from '@nestjs/common';

const mockGetSchemaPath = jest.fn().mockReturnValue('#/components/schemas/MockEntity');
const mockApiExtraModels = jest.fn().mockReturnValue(jest.fn());
const mockApiOkResponse = jest.fn().mockReturnValue(jest.fn());
const mockApiCreatedResponse = jest.fn().mockReturnValue(jest.fn());
const mockApiNoContentResponse = jest.fn().mockReturnValue(jest.fn());
const mockApiBadRequestResponse = jest.fn().mockReturnValue(jest.fn());
const mockApiUnauthorizedResponse = jest.fn().mockReturnValue(jest.fn());
const mockApiForbiddenResponse = jest.fn().mockReturnValue(jest.fn());
const mockApiNotFoundResponse = jest.fn().mockReturnValue(jest.fn());
const mockApiConflictResponse = jest.fn().mockReturnValue(jest.fn());
const mockApiUnprocessableEntityResponse = jest.fn().mockReturnValue(jest.fn());
const mockApiTooManyRequestsResponse = jest.fn().mockReturnValue(jest.fn());

jest.mock('@nestjs/swagger', () => ({
  getSchemaPath: mockGetSchemaPath,
  ApiExtraModels: mockApiExtraModels,
  ApiOkResponse: mockApiOkResponse,
  ApiCreatedResponse: mockApiCreatedResponse,
  ApiNoContentResponse: mockApiNoContentResponse,
  ApiBadRequestResponse: mockApiBadRequestResponse,
  ApiUnauthorizedResponse: mockApiUnauthorizedResponse,
  ApiForbiddenResponse: mockApiForbiddenResponse,
  ApiNotFoundResponse: mockApiNotFoundResponse,
  ApiConflictResponse: mockApiConflictResponse,
  ApiUnprocessableEntityResponse: mockApiUnprocessableEntityResponse,
  ApiTooManyRequestsResponse: mockApiTooManyRequestsResponse,
}));

import { ApiResponse, CrudApi } from './api-response.decorator.js';

class MockEntity {
  id!: string;
  name!: string;
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── ApiResponse ───────────────────────────────────────────────────

describe('ApiResponse', () => {
  describe('GET (single)', () => {
    it('should apply ApiOkResponse with single schema', () => {
      class TestController {
        @Get(':id')
        @ApiResponse(MockEntity)
        findOne() {}
      }
      void TestController;

      expect(mockApiExtraModels).toHaveBeenCalledWith(MockEntity);
      expect(mockApiOkResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 200,
          schema: expect.objectContaining({
            type: 'object',
            properties: expect.objectContaining({
              data: expect.objectContaining({ $ref: '#/components/schemas/MockEntity' }),
            }),
          }),
        }),
      );
    });
  });

  describe('GET (paged)', () => {
    it('should apply ApiOkResponse with paged schema', () => {
      class TestController {
        @Get()
        @ApiResponse(MockEntity, { mode: 'paged' })
        findAll() {}
      }
      void TestController;

      expect(mockApiOkResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 200,
          schema: expect.objectContaining({
            type: 'object',
            properties: expect.objectContaining({
              data: expect.any(Object),
              total: { type: 'number' },
              page: { type: 'number' },
              limit: { type: 'number' },
            }),
          }),
        }),
      );
    });
  });

  describe('GET (offset)', () => {
    it('should apply ApiOkResponse with offset schema', () => {
      class TestController {
        @Get()
        @ApiResponse(MockEntity, { mode: 'offset' })
        findOffset() {}
      }
      void TestController;

      expect(mockApiOkResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 200,
          schema: expect.objectContaining({
            type: 'object',
            properties: expect.objectContaining({
              data: expect.any(Object),
              total: { type: 'number' },
              skip: { type: 'number' },
              limit: { type: 'number' },
            }),
          }),
        }),
      );
    });
  });

  describe('GET (cursor)', () => {
    it('should apply ApiOkResponse with cursor schema', () => {
      class TestController {
        @Get()
        @ApiResponse(MockEntity, { mode: 'cursor' })
        findCursor() {}
      }
      void TestController;

      expect(mockApiOkResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 200,
          schema: expect.objectContaining({
            type: 'object',
            properties: expect.objectContaining({
              data: expect.any(Object),
              nextCursor: { type: 'string', nullable: true },
              hasMore: { type: 'boolean' },
            }),
          }),
        }),
      );
    });
  });

  describe('POST', () => {
    it('should apply ApiCreatedResponse when status is provided', () => {
      class TestController {
        @Post()
        @ApiResponse(MockEntity, { status: 201 })
        create() {}
      }
      void TestController;

      expect(mockApiCreatedResponse).toHaveBeenCalledWith(expect.objectContaining({ status: 201 }));
    });
  });

  describe('PATCH', () => {
    it('should apply ApiOkResponse with status 200', () => {
      class TestController {
        @Patch(':id')
        @ApiResponse(MockEntity)
        update() {}
      }
      void TestController;

      expect(mockApiOkResponse).toHaveBeenCalledWith(expect.objectContaining({ status: 200 }));
    });
  });

  describe('DELETE', () => {
    it('should apply ApiNoContentResponse when status is provided', () => {
      class TestController {
        @Delete(':id')
        @ApiResponse(MockEntity, { status: 204 })
        remove() {}
      }
      void TestController;

      expect(mockApiNoContentResponse).toHaveBeenCalledWith(
        expect.objectContaining({ status: 204 }),
      );
    });
  });

  describe('error responses', () => {
    it('should apply single error description', () => {
      class TestController {
        @Get(':id')
        @ApiResponse(MockEntity, { errors: { notFound: 'User not found' } })
        findOne() {}
      }
      void TestController;

      expect(mockApiNotFoundResponse).toHaveBeenCalledWith({
        description: 'User not found',
      });
    });

    it('should apply array of error descriptions for same status', () => {
      class TestController {
        @Post()
        @ApiResponse(MockEntity, {
          errors: {
            conflict: ['Email already exists', 'Username taken'],
          },
        })
        create() {}
      }
      void TestController;

      expect(mockApiConflictResponse).toHaveBeenCalledTimes(2);
      expect(mockApiConflictResponse).toHaveBeenNthCalledWith(1, {
        description: 'Email already exists',
      });
      expect(mockApiConflictResponse).toHaveBeenNthCalledWith(2, {
        description: 'Username taken',
      });
    });

    it('should apply true as default message', () => {
      class TestController {
        @Post()
        @ApiResponse(MockEntity, { errors: { badRequest: true } })
        create() {}
      }
      void TestController;

      expect(mockApiBadRequestResponse).toHaveBeenCalledWith({
        description: 'Bad request',
      });
    });

    it('should apply multiple error types', () => {
      class TestController {
        @Patch(':id')
        @ApiResponse(MockEntity, {
          errors: {
            notFound: 'User not found',
            conflict: 'Duplicate email',
            badRequest: 'Validation failed',
          },
        })
        update() {}
      }
      void TestController;

      expect(mockApiNotFoundResponse).toHaveBeenCalledTimes(1);
      expect(mockApiConflictResponse).toHaveBeenCalledTimes(1);
      expect(mockApiBadRequestResponse).toHaveBeenCalledTimes(1);
    });
  });

  describe('custom status', () => {
    it('should use custom status code', () => {
      class TestController {
        @Get()
        @ApiResponse(MockEntity, { status: 202 })
        findAll() {}
      }
      void TestController;

      expect(mockApiOkResponse).toHaveBeenCalledWith(expect.objectContaining({ status: 202 }));
    });
  });

  describe('description', () => {
    it('should pass description to response decorator', () => {
      class TestController {
        @Get(':id')
        @ApiResponse(MockEntity, { description: 'User retrieved successfully' })
        findOne() {}
      }
      void TestController;

      expect(mockApiOkResponse).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'User retrieved successfully' }),
      );
    });
  });
});

// ── CrudApi ───────────────────────────────────────────────────────

describe('CrudApi', () => {
  it('should apply responses to all CRUD methods', () => {
    @CrudApi(MockEntity, {
      create: { errors: { conflict: 'Email exists' } },
      findOne: { errors: { notFound: 'Not found' } },
      update: { errors: { notFound: 'Not found', conflict: 'Duplicate' } },
      delete: { errors: { notFound: 'Not found' } },
    })
    class TestController {
      @Get()
      findAll() {}

      @Get(':id')
      findOne() {}

      @Post()
      create() {}

      @Patch(':id')
      update() {}

      @Delete(':id')
      remove() {}
    }

    // eslint-disable-next-line no-new
    new TestController();

    // GET findOne → ApiOkResponse (200)
    expect(mockApiOkResponse).toHaveBeenCalled();

    // POST create → ApiCreatedResponse (201)
    expect(mockApiCreatedResponse).toHaveBeenCalled();

    // DELETE remove → ApiNoContentResponse (204)
    expect(mockApiNoContentResponse).toHaveBeenCalled();

    // Error responses
    expect(mockApiConflictResponse).toHaveBeenCalled();
    expect(mockApiNotFoundResponse).toHaveBeenCalled();
  });

  it('should not apply responses to methods without matching HTTP method', () => {
    @CrudApi(MockEntity)
    class TestController {
      @Get()
      findAll() {}

      @Get(':id')
      findOne() {}
    }

    // eslint-disable-next-line no-new
    new TestController();

    // Both findAll and findOne should get responses, but validateInput should not
    expect(mockApiOkResponse).toHaveBeenCalledTimes(2);
  });

  it('should apply default errors when no options provided', () => {
    @CrudApi(MockEntity)
    class TestController {
      @Post()
      create() {}

      @Get(':id')
      findOne() {}
    }

    // eslint-disable-next-line no-new
    new TestController();

    // Should still apply success responses even without errors
    expect(mockApiCreatedResponse).toHaveBeenCalled();
    expect(mockApiOkResponse).toHaveBeenCalled();
  });

  it('should skip methods where HTTP method does not match expected', () => {
    @CrudApi(MockEntity, {
      create: { errors: { conflict: 'Exists' } },
    })
    class TestController {
      @Get()
      findAll() {}

      @Get(':id')
      findOne() {}

      @Post()
      create() {}
    }

    // eslint-disable-next-line no-new
    new TestController();

    // create errors should be applied
    expect(mockApiConflictResponse).toHaveBeenCalledTimes(1);
    // findAll and findOne should still get success responses
    expect(mockApiOkResponse).toHaveBeenCalled();
  });
});
