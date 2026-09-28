const User = require('../models/User');

// Lightweight role check for a school project: no JWT session, but every
// authenticated request from the app includes the logged-in user's Mongo
// id in the `x-user-id` header (set automatically by src/api/api.js on the
// mobile side once someone logs in). This is enough to stop an unauthenticated
// client from hitting admin/guard-only endpoints, without building a full
// token/session system.
//
// NOTE: this is app-level access control, not cryptographic auth — a user id
// is not a secret. That trade-off is acceptable for a campus demo/thesis
// project; a production system would issue a signed JWT at login instead
// and verify that here.
function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    try {
      const userId = req.headers['x-user-id'];
      if (!userId) {
        return res.status(401).json({ message: 'Not logged in.' });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(401).json({ message: 'Invalid session. Please log in again.' });
      }

      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: 'You are not authorized to do this.' });
      }

      req.currentUser = user;
      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };
}

module.exports = { requireRole };
