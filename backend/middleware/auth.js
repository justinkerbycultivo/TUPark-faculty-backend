// Header-based "auth" for this school project demo.
//
// IMPORTANT: this is NOT cryptographically secure. It trusts a plain
// `x-user-id` header sent by the client to identify the current user, with
// no signature, token expiry, or session verification. This is acceptable
// only for a school project demo. A real production system would use
// JWT access tokens or server-side sessions instead.

const User = require('../models/User');

function requireRole(...allowedRoles) {
  return async function (req, res, next) {
    try {
      const userId = req.header('x-user-id');
      if (!userId) {
        return res.status(401).json({ message: 'Missing x-user-id header.' });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(401).json({ message: 'User not found.' });
      }

      // Guards awaiting approval (or rejected) get no access to ANY protected
      // endpoint, regardless of what the app sends. Missing field = approved.
      if (user.approvalStatus && user.approvalStatus !== 'approved') {
        return res.status(403).json({
          message:
            user.approvalStatus === 'pending'
              ? 'Your account is awaiting admin approval.'
              : 'Your account registration was not approved.',
        });
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        let message = `Access denied for role "${user.role}".`;
        if (user.role === 'student' && allowedRoles.includes('faculty')) {
          message = 'Students are not allowed to make parking reservations.';
        }
        return res.status(403).json({ message });
      }

      req.currentUser = user;
      next();
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };
}

module.exports = { requireRole };
