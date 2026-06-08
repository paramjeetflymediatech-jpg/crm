const jwt = require('jsonwebtoken');

// Load environment variables manually
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_crm_jwt_access_token_key_2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super_secret_crm_jwt_refresh_token_key_2026';

function signAccessToken(payload) {
  // Access Token expires in 1 hour
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

function signRefreshToken(payload) {
  // Refresh Token expires in 7 days
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

function verifyAccessToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (error) {
    return null;
  }
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
};
