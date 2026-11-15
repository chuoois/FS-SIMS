const { randomUUID } = require('crypto');

function buildSuccessResponse({
  status = 200,
  message = 'Success',
  data = null,
  req,
  meta = null,
} = {}) {
  const traceId = req?.traceId || req?.get?.('x-trace-id') || randomUUID();
  const response = {
    status: Number(status) || 200,
    message,
    data,
    instance: req?.originalUrl || req?.url || '/',
    traceId,
    timestamp: new Date().toISOString(),
  };

  if (meta) {
    response.meta = meta;
  }

  return response;
}

module.exports = { buildSuccessResponse };
