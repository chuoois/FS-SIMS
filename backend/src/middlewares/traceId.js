const { randomUUID } = require('crypto');
const { buildSuccessResponse } = require('../utils/successResponse');

function traceIdMiddleware(req, res, next) {
  const incomingTraceId = req.get('x-trace-id');
  req.traceId = incomingTraceId || randomUUID();
  res.setHeader('x-trace-id', req.traceId);

  res.success = function sendSuccess(payload = {}) {
    const { status = 200, message = 'Success', data = null, meta = null } = payload;
    const response = buildSuccessResponse({ status, message, data, req, meta });
    return res.status(status).json(response);
  };

  next();
}

module.exports = traceIdMiddleware;
