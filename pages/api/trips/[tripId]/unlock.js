/**
 * API Route: /api/trips/[tripId]/unlock
 * POST - Verify passcode and return token
 */

const { trips } = require('../../../../lib/db');
const { verifyPasscode, generateToken, getTokenExpiry } = require('../../../../lib/auth');
const { checkRateLimit, resetRateLimit, getRateLimitKey } = require('../../../../lib/rate-limit');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { tripId } = req.query;

    // Check rate limit
    const rateLimitKey = getRateLimitKey(req, tripId);
    const rateLimit = checkRateLimit(rateLimitKey);

    if (rateLimit.limited) {
        res.setHeader('Retry-After', rateLimit.retryAfter);
        return res.status(429).json({
            error: 'Too many unlock attempts',
            retryAfter: rateLimit.retryAfter
        });
    }

    try {
        const { passcode } = req.body;

        if (!passcode || typeof passcode !== 'string') {
            return res.status(400).json({ error: 'Passcode is required' });
        }

        // Get trip passcode hash
        const passcodeHash = await trips.getPasscodeHash(tripId);

        if (!passcodeHash) {
            return res.status(404).json({ error: 'Trip not found' });
        }

        // Verify passcode
        const valid = await verifyPasscode(passcode, passcodeHash);

        if (!valid) {
            return res.status(401).json({
                error: 'Invalid passcode',
                attemptsRemaining: rateLimit.remaining
            });
        }

        // Reset rate limit on success
        resetRateLimit(rateLimitKey);

        // Generate token
        const token = generateToken(tripId);
        const expiresAt = getTokenExpiry(token);

        return res.status(200).json({
            token,
            expiresAt
        });
    } catch (error) {
        console.error('Unlock trip error:', error);
        return res.status(500).json({ error: 'Failed to unlock trip' });
    }
};
