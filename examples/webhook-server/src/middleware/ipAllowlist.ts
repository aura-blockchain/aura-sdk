import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

/**
 * Express middleware to validate IP allowlist
 */
export function ipAllowlist(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const allowedIps = process.env.ALLOWED_IPS?.split(',')
    .map((ip) => ip.trim())
    .filter(Boolean);

  // If no allowlist configured, allow all IPs
  if (!allowedIps || allowedIps.length === 0) {
    next();
    return;
  }

  const clientIp = getClientIp(req);

  if (!clientIp) {
    logger.warn('Unable to determine client IP', {
      headers: req.headers,
    });
    res.status(403).json({
      error: 'Forbidden',
      message: 'Unable to determine client IP',
    });
    return;
  }

  if (!allowedIps.includes(clientIp)) {
    logger.warn('Request from disallowed IP', {
      ip: clientIp,
      path: req.path,
    });
    res.status(403).json({
      error: 'Forbidden',
      message: 'IP address not allowed',
    });
    return;
  }

  next();
}

/**
 * Get client IP from request
 * Checks X-Forwarded-For header first (for proxies/load balancers)
 */
function getClientIp(req: Request): string | undefined {
  const forwardedFor = req.headers['x-forwarded-for'];

  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, get the first one
    const ips = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor;
    return ips.split(',')[0].trim();
  }

  return req.ip || req.socket.remoteAddress;
}
