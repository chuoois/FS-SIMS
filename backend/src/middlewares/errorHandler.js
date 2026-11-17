const { ApiError } = require('../utils/ApiError');
const { buildProblemDetails } = require('../utils/problemDetails');

function notFoundHandler(req, res, next) {
  next(new ApiError(404, `Route ${req.originalUrl} not found`));
}

function errorHandler(err, req, res, next) {
  const statusCode = err instanceof ApiError ? err.statusCode : 500;
  const detail = err instanceof ApiError ? err.detail : 'Đã có lỗi xảy ra trên máy chủ.';
  const traceId = req.traceId || req.get('x-trace-id');

  if (statusCode >= 500) {
    console.error(`[${traceId}]`, err);
  }

  const problem = buildProblemDetails({
    req,
    status: statusCode,
    detail,
    traceId,
  });

  res.setHeader('x-trace-id', problem.traceId);
  res.status(statusCode).type('application/problem+json').json(problem);
}

module.exports = { notFoundHandler, errorHandler };
