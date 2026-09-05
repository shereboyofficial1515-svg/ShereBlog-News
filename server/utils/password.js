const bcrypt = require('bcrypt');
const env = require('../config/env');

/**
 * Hash a plain-text password. Never store or log the plain-text value.
 */
async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, env.bcryptSaltRounds);
}

/**
 * Compare a plain-text password against a stored bcrypt hash.
 */
async function verifyPassword(plainPassword, hash) {
  return bcrypt.compare(plainPassword, hash);
}

module.exports = { hashPassword, verifyPassword };
