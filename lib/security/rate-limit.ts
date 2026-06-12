type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function now() {
  return Date.now();
}

export function checkRateLimit({
  key,
  limit,
  windowMs
}: RateLimitOptions): RateLimitResult {
  const currentTime = now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= currentTime) {
    const resetAt = currentTime + windowMs;
    buckets.set(key, { count: 1, resetAt });

    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      resetAt
    };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt
    };
  }

  existing.count += 1;
  buckets.set(key, existing);

  return {
    allowed: true,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt
  };
}

export function getClientIp(headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return headers.get("x-real-ip") ?? "unknown";
}

export function rateLimitRetryAfterSeconds(resetAt: number) {
  return Math.max(1, Math.ceil((resetAt - now()) / 1000));
}

export function rateLimitMessage() {
  return "Has realizado demasiados intentos. Espera un momento y vuelve a probar.";
}

export function assertActionRateLimit(key: string, limit: number, windowMs: number) {
  const result = checkRateLimit({ key, limit, windowMs });

  if (!result.allowed) {
    throw new Error(rateLimitMessage());
  }
}
