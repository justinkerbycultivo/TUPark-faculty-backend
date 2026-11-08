
const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const ParkingTransaction = require('../models/ParkingTransaction');
const { requireRole } = require('../middleware/auth');

// GET /api/transactions
// Admin only: retrieve complete parking transaction history.
router.get('/', requireRole('admin'), async (req, res) => {
  try {
    const transactions = await ParkingTransaction.find()
      .populate(['area', 'spaces', 'user', 'visitorTicket'])
      .sort({ createdAt: -1 });

    return res.json(transactions);
  } catch (err) {
    console.error('Get all transactions error:', err);

    return res.status(500).json({
      message: 'Unable to retrieve parking transactions.',
    });
  }
});

// GET /api/transactions/active
// Faculty, guards, and admins can view active parking transactions.
// Student accounts do not need access to the complete active list.
router.get(
  '/active',
  requireRole('faculty', 'guard', 'admin'),
  async (req, res) => {
    try {
      const transactions = await ParkingTransaction.find({
        status: 'ACTIVE',
      })
        .populate(['area', 'spaces'])
        .sort({ entryTime: -1 });

      return res.json(transactions);
    } catch (err) {
      console.error('Get active transactions error:', err);

      return res.status(500).json({
        message: 'Unable to retrieve active parking transactions.',
      });
    }
  }
);

// GET /api/transactions/student/:userId
// Students can only retrieve their own history.
// Admins may retrieve the history of another user.
router.get(
  '/student/:userId',
  requireRole('student', 'admin'),
  async (req, res) => {
    try {
      const { userId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          message: 'Invalid user ID.',
        });
      }

      const authenticatedUserId = String(req.currentUser._id);
      const isAdmin = req.currentUser.role === 'admin';

      if (!isAdmin && authenticatedUserId !== userId) {
        return res.status(403).json({
          message: 'You can only access your own parking history.',
        });
      }

      const transactions = await ParkingTransaction.find({
        user: userId,
        subjectType: 'student',
      })
        .populate(['area', 'spaces'])
        .sort({ createdAt: -1 });

      return res.json(transactions);
    } catch (err) {
      console.error('Get student transactions error:', err);

      return res.status(500).json({
        message: 'Unable to retrieve parking history.',
      });
    }
  }
);

// POST /api/transactions/:id/photo
// The transaction owner may submit their photo.
// Guards and admins may also submit photos for operational purposes.
router.post(
  '/:id/photo',
  requireRole('student', 'guard', 'admin'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { photoBase64 } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          message: 'Invalid transaction ID.',
        });
      }

      if (
        typeof photoBase64 !== 'string' ||
        !photoBase64.trim()
      ) {
        return res.status(400).json({
          message: 'A valid photo is required.',
        });
      }

      const transaction = await ParkingTransaction.findById(id);

      if (!transaction) {
        return res.status(404).json({
          message: 'Transaction not found.',
        });
      }

      const isAdmin = req.currentUser.role === 'admin';
      const isGuard = req.currentUser.role === 'guard';

      const isOwner =
        transaction.subjectType === 'student' &&
        transaction.user &&
        String(transaction.user) === String(req.currentUser._id);

      if (!isOwner && !isAdmin && !isGuard) {
        return res.status(403).json({
          message: 'You are not authorized to submit a photo for this transaction.',
        });
      }

      transaction.photoBase64 = photoBase64.trim();
      transaction.photoStatus = 'submitted';
      transaction.photoSubmittedAt = new Date();

      await transaction.save();

      return res.json(transaction);
    } catch (err) {
      console.error('Submit transaction photo error:', err);

      return res.status(500).json({
        message: 'Unable to submit the parking photo.',
      });
    }
  }
);

module.exports = router;
