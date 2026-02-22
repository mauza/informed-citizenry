"use server";

// In-memory rate limiting for server actions
// In production, this should be replaced with Redis or similar

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const DEFAULT_LIMIT: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 60000, // 1 minute
};

export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = DEFAULT_LIMIT
): Promise<{ success: boolean; remaining: number; resetTime: number }> {
  const now = Date.now();
  const key = identifier;
  
  const existing = rateLimitMap.get(key);
  
  if (!existing || now > existing.resetTime) {
    // Reset or create new window
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    };
  }
  
  if (existing.count >= config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetTime: existing.resetTime,
    };
  }
  
  existing.count++;
  return {
    success: true,
    remaining: config.maxRequests - existing.count,
    resetTime: existing.resetTime,
  };
}

// Cleanup old entries every 5 minutes
if (typeof global !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitMap.entries()) {
      if (now > value.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }, 300000);
}
