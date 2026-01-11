/**
 * Authentication Module - JWT tokens and passcode hashing
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Secret key - in production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'bangin-travel-secret-key-change-in-production';
const TOKEN_EXPIRY = '7d'; // 7 days
const BCRYPT_ROUNDS = 10;

/**
 * Hash a passcode using bcrypt
 */
async function hashPasscode(passcode) {
    return bcrypt.hash(passcode, BCRYPT_ROUNDS);
}

/**
 * Verify a passcode against a hash
 */
async function verifyPasscode(passcode, hash) {
    return bcrypt.compare(passcode, hash);
}

/**
 * Generate a JWT token for a trip
 */
function generateToken(tripId) {
    const payload = {
        tripId,
        iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

/**
 * Verify and decode a JWT token
 */
function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return {
            valid: true,
            tripId: decoded.tripId,
            exp: decoded.exp
        };
    } catch (error) {
        return {
            valid: false,
            error: error.message
        };
    }
}

/**
 * Extract token from Authorization header
 */
function extractToken(authHeader) {
    if (!authHeader) return null;

    if (authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7);
    }

    return null;
}

/**
 * Calculate token expiration date
 */
function getTokenExpiry(token) {
    try {
        const decoded = jwt.decode(token);
        if (decoded && decoded.exp) {
            return new Date(decoded.exp * 1000).toISOString();
        }
    } catch {
        // Ignore decode errors
    }
    return null;
}

module.exports = {
    hashPasscode,
    verifyPasscode,
    generateToken,
    verifyToken,
    extractToken,
    getTokenExpiry
};
