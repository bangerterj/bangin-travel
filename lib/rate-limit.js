/**
 * Rate Limiting Module - Simple in-memory rate limiter for unlock attempts
 */

// Store: { key: { count: number, resetAt: number } }
const attempts = new Map();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

/**
 * Check if a request should be rate limited
 * @param {string} key - Unique identifier (e.g., IP + tripId)
 * @returns {{ limited: boolean, remaining: number, retryAfter?: number }}
 */
function checkRateLimit(key) {
    const now = Date.now();
    const record = attempts.get(key);

    // Clean up expired records
    if (record && now >= record.resetAt) {
        attempts.delete(key);
    }

    const current = attempts.get(key);

    if (!current) {
        // First attempt
        attempts.set(key, {
            count: 1,
            resetAt: now + WINDOW_MS
        });
        return { limited: false, remaining: MAX_ATTEMPTS - 1 };
    }

    if (current.count >= MAX_ATTEMPTS) {
        const retryAfter = Math.ceil((current.resetAt - now) / 1000);
        return { limited: true, remaining: 0, retryAfter };
    }

    // Increment count
    current.count += 1;
    attempts.set(key, current);

    return { limited: false, remaining: MAX_ATTEMPTS - current.count };
}

/**
 * Reset rate limit for a key (e.g., after successful unlock)
 */
function resetRateLimit(key) {
    attempts.delete(key);
}

/**
 * Get rate limit key from request
 */
function getRateLimitKey(req, tripId) {
    // Get IP from various headers
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.headers['x-real-ip'] ||
        req.socket?.remoteAddress ||
        'unknown';
    return `${ip}:${tripId}`;
}

module.exports = {
    checkRateLimit,
    resetRateLimit,
    getRateLimitKey
};
