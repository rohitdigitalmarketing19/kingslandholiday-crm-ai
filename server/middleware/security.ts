import { Request, Response, NextFunction } from 'express';

// In-memory rate limiting store
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore: Record<string, RateLimitRecord> = {};

/**
 * Security Headers Middleware — Protects against XSS, Clickjacking, MIME sniffing & drive-by attacks
 */
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent Clickjacking framing
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  
  // Enable browser XSS filtering
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Restrict referrer information sent to external sites
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Disable Flash/PDF cross-domain policies
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  
  // Restrict browser features
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Prevent caching of sensitive API responses
  if (req.path.startsWith('/api')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  next();
}

/**
 * Rate Limiting Middleware — Protects against DoS & Brute-Force attacks
 */
export function rateLimiterMiddleware(maxRequests: number = 200, windowMs: number = 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
    const key = `${ip}:${req.baseUrl || req.path}`;
    const now = Date.now();

    if (!rateLimitStore[key] || now > rateLimitStore[key].resetAt) {
      rateLimitStore[key] = {
        count: 1,
        resetAt: now + windowMs
      };
      return next();
    }

    rateLimitStore[key].count++;

    if (rateLimitStore[key].count > maxRequests) {
      return res.status(429).json({
        error: 'Too many requests. Please slow down and try again in a minute.',
        retryAfterSeconds: Math.ceil((rateLimitStore[key].resetAt - now) / 1000)
      });
    }

    next();
  };
}

/**
 * Input Sanitization Helper — Strips malicious script tags from incoming request payloads
 */
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/javascript:[^\s"]*/gi, '');
  }
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  if (input !== null && typeof input === 'object') {
    const sanitized: Record<string, any> = {};
    for (const key of Object.keys(input)) {
      sanitized[key] = sanitizeInput(input[key]);
    }
    return sanitized;
  }
  return input;
}

/**
 * Request Body Sanitizer Middleware
 */
export function bodySanitizerMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeInput(req.body);
  }
  next();
}
