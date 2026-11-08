// Minimal in-memory fixed-window rate limiter (no extra dependency).
// Keyed per client IP + a route-specific suffix. State resets on server
// restart and is per-process, which is adequate for a single Render instance.
function rateLimit({ windowMs, max, message }) {
  const hits = new Map();
  return function (req, res, next) {
    const now = Date.now();
    const key = `${req.ip}:${req.baseUrl}${req.path}`;
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
    } else {
      entry.count += 1;
      if (entry.count > max) {
        res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
        return res.status(429).json({ message: message || 'Too many requests. Please try again later.' });
      }
    }
    // Opportunistic cleanup so the map cannot grow without bound.
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
    }
    next();
  };
}

module.exports = { rateLimit };
