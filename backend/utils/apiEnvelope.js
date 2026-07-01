import crypto from 'crypto';

export function requestIdMiddleware(req, res, next) {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}

function normalizeError(body, status) {
  if (body?.error && typeof body.error === 'object') {
    return {
      code: body.error.code || body.error.status || status,
      message: body.error.message || 'Request failed',
      details: body.error.details || body.details || null
    };
  }

  return {
    code: body?.code || status,
    message: body?.error || body?.message || 'Request failed',
    details: body?.details || null
  };
}

export function envelopeMiddleware(req, res, next) {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    if (body && typeof body === 'object' && 'ok' in body && 'data' in body && 'error' in body) {
      return originalJson(body);
    }

    const status = res.statusCode || 200;
    const payload = status >= 400
      ? {
          ok: false,
          data: null,
          error: normalizeError(body, status),
          requestId: req.requestId
        }
      : {
          ok: true,
          data: body ?? null,
          error: null,
          requestId: req.requestId
        };

    return originalJson(payload);
  };

  next();
}

export function sendOk(req, res, data = null, status = 200) {
  return res.status(status).json({
    ok: true,
    data,
    error: null,
    requestId: req.requestId
  });
}

export function sendError(req, res, status, message, details = null, code = status) {
  return res.status(status).json({
    ok: false,
    data: null,
    error: { code, message, details },
    requestId: req.requestId
  });
}

export function asyncHandler(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}
