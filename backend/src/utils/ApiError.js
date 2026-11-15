class ApiError extends Error {
  constructor(statusCode, detail, options = {}) {
    super(detail || 'Unexpected error');
    this.name = 'ApiError';
    this.statusCode = Number(statusCode) || 500;
    this.detail = detail || 'Unexpected error';
    this.title = options.title || null;
    this.type = options.type || null;
    this.traceId = options.traceId || null;
  }
}

module.exports = { ApiError };
