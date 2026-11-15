const { buildProblemDetails } = require('../src/utils/problemDetails');
const { buildSuccessResponse } = require('../src/utils/successResponse');

describe('response format helpers', () => {
  beforeAll(() => {
    process.env.ERROR_TYPE_BASE_URL = 'https://api.example.com';
  });

  test('buildSuccessResponse returns standardized success payload', () => {
    const req = {
      originalUrl: '/api/auth/login',
      traceId: 'trace-123',
    };

    const response = buildSuccessResponse({
      status: 200,
      message: 'Đăng nhập thành công',
      data: { accessToken: 'abc' },
      req,
      meta: { page: 1 },
    });

    expect(response).toMatchObject({
      status: 200,
      message: 'Đăng nhập thành công',
      data: { accessToken: 'abc' },
      instance: '/api/auth/login',
      traceId: 'trace-123',
    });
    expect(response.meta).toEqual({ page: 1 });
    expect(typeof response.timestamp).toBe('string');
  });

  test('buildProblemDetails returns RFC 7807 payload for conflict errors', () => {
    const req = {
      originalUrl: '/api/auth/register',
      traceId: 'trace-456',
    };

    const problem = buildProblemDetails({
      req,
      status: 409,
      detail: 'Email đã được sử dụng',
    });

    expect(problem).toMatchObject({
      type: 'https://api.example.com/errors/conflict',
      title: 'Conflict',
      status: 409,
      detail: 'Email đã được sử dụng',
      instance: '/api/auth/register',
      traceId: 'trace-456',
    });
    expect(typeof problem.timestamp).toBe('string');
  });

  test('buildProblemDetails falls back to internal server error metadata', () => {
    const req = {
      originalUrl: '/api/auth/refresh',
    };

    const problem = buildProblemDetails({
      req,
      status: 500,
      detail: 'Lỗi máy chủ',
    });

    expect(problem).toMatchObject({
      type: 'https://api.example.com/errors/internal-server-error',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Lỗi máy chủ',
      instance: '/api/auth/refresh',
    });
    expect(problem.traceId).toBeTruthy();
  });
});
