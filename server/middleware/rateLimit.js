export function rateLimit({ windowMs = 15 * 60 * 1000, limit = 10, message = "Too many requests." } = {}) {
  const requests = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket?.remoteAddress || "unknown";
    let current = requests.get(key);

    if (!current || current.resetAt <= now) {
      current = { count: 0, resetAt: now + windowMs };
      requests.set(key, current);
    }

    // Bound memory use when a process sees many unique client addresses.
    if (requests.size > 10000) {
      for (const [address, bucket] of requests) {
        if (bucket.resetAt <= now) requests.delete(address);
      }
    }

    current.count += 1;
    res.set("RateLimit-Limit", String(limit));
    res.set("RateLimit-Remaining", String(Math.max(0, limit - current.count)));
    res.set("RateLimit-Reset", String(Math.ceil((current.resetAt - now) / 1000)));

    if (current.count > limit) {
      res.set("Retry-After", String(Math.max(1, Math.ceil((current.resetAt - now) / 1000))));
      return res.status(429).json({ error: message });
    }
    return next();
  };
}
