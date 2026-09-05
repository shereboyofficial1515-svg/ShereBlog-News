const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Access token: short-lived, carries user id + role, sent on every
 * authenticated request via the Authorization header.
 */
function signAccessToken(payload) {
  return jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.secret);
}

/**
 * Refresh token: longer-lived, used only to mint new access tokens.
 * Stored by the client as an httpOnly cookie in production.
 */
function signRefreshToken(payload) {
  return jwt.sign(payload, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshExpiresIn });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwt.refreshSecret);
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
};
