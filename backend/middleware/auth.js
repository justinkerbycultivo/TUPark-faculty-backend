
const jwt = require('jsonwebtoken');
const User = require('../models/User');

function requireRole(...allowedRoles) {
  return async function (req, res, next) {
    try {
      const authHeader = req.headers.authorization || '';

      if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          message: 'Authentication required. Please log in again.',
        });
      }

      const token = authHeader.slice(7).trim();

      if (!token) {
        return res.status(401).json({
          message: 'Authentication token is missing.',
        });
      }

      if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET is not configured.');

        return res.status(500).json({
          message: 'Authentication service is not configured.',
        });
      }

      let decoded;

      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET, {
          algorithms: ['HS256'],
        });
      } catch (error) {
        return res.status(401).json({
          message:
            error.name === 'TokenExpiredError'
              ? 'Your session has expired. Please log in again.'
              : 'Invalid authentication token. Please log in again.',
        });
      }

      if (
        !decoded ||
        typeof decoded.sub !== 'string' ||
        !Number.isInteger(decoded.tokenVersion)
      ) {
        return res.status(401).json({
          message: 'Invalid authentication token.',
        });
      }

      const user = await User.findById(decoded.sub);

      if (!user) {
        return res.status(401).json({
          message: 'Account not found. Please log in again.',
        });
      }

      const currentTokenVersion = Number(user.tokenVersion || 0);

      if (decoded.tokenVersion !== currentTokenVersion) {
        return res.status(401).json({
          message: 'Your session is no longer valid. Please log in again.',
        });
      }

      if (
        user.approvalStatus &&
        user.approvalStatus !== 'approved'
      ) {
        return res.status(403).json({
          message:
            user.approvalStatus === 'pending'
              ? 'Your account is awaiting admin approval.'
              : 'Your account registration was not approved.',
        });
      }

      if (
        allowedRoles.length > 0 &&
        !allowedRoles.includes(user.role)
      ) {
        let message = `Access denied for role "${user.role}".`;

        if (
          user.role === 'student' &&
          allowedRoles.includes('faculty')
        ) {
          message =
            'Students are not allowed to make parking reservations.';
        }

        return res.status(403).json({ message });
      }

      req.currentUser = user;
      req.auth = {
        userId: decoded.sub,
        tokenVersion: decoded.tokenVersion,
      };

      return next();
    } catch (error) {
      console.error('Authentication middleware error:', error);

      return res.status(500).json({
        message: 'Authentication service error.',
      });
    }
  };
}

module.exports = { requireRole };
