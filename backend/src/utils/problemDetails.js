const { randomUUID } = require('crypto');

function getStatusMeta(statusCode) {
  switch (statusCode) {
    case 400:
      return { slug: 'bad-request', title: 'Bad Request' };
    case 401:
      return { slug: 'unauthorized', title: 'Unauthorized' };
    case 403:
      return { slug: 'forbidden', title: 'Forbidden' };
    case 404:
      return { slug: 'not-found', title: 'Not Found' };
    case 409:
      return { slug: 'conflict', title: 'Conflict' };
    case 500:
    default:
      return { slug: 'internal-server-error', title: 'Internal Server Error' };
  }
}

function buildProblemDetails({
  req,
  status = 500,
  detail,
  type = null,
  title = null,
  traceId = null,
} = {}) {
  const resolvedStatus = Number(status) || 500;
  const { slug, title: defaultTitle } = getStatusMeta(resolvedStatus);
  const baseUrl = process.env.CORS_ORIGIN || 'https://api.example.com';
  const resolvedTraceId = traceId || req?.traceId || req?.get?.('x-trace-id') || randomUUID();

  return {
    type: type || `${baseUrl}/errors/${slug}`,
    title: title || defaultTitle,
    status: resolvedStatus,
    detail: detail || defaultTitle,
    instance: req?.originalUrl || req?.url || '/',
    traceId: resolvedTraceId,
    timestamp: new Date().toISOString(),
  };
}

module.exports = { buildProblemDetails };
