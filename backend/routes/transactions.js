const express = require('express');
const router = express.Router();

const ParkingTransaction = require('../models/ParkingTransaction');
const { requireRole } = require('../middleware/auth');

// GET /api/transactions — admin only, full history.
router.get('/', requireRole('admin'), async (req, res) => {
  try {
    const transactions = await ParkingTransaction.find()
      .populate(['area', 'spaces', 'user', 'visitorTicket'])
      .sort({ createdAt: -1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/transactions/active — public-ish (used by map views); returns all active transactions.
router.get('/active', async (req, res) => {
  try {
    const transactions = await ParkingTransaction.find({ status: 'ACTIVE' }).populate(['area', 'spaces']);
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/transactions/student/:userId — a student's own transaction history.
router.get('/student/:userId', async (req, res) => {
  try {
    const transactions = await ParkingTransaction.find({ user: req.params.userId })
      .populate(['area', 'spaces'])
      .sort({ createdAt: -1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/transactions/:id/photo — submit the required parking photo.
router.post('/:id/photo', async (req, res) => {
  try {
    const { photoBase64 } = req.body;
    if (!photoBase64) return res.status(400).json({ message: 'photoBase64 is required.' });

    const transaction = await ParkingTransaction.findById(req.params.id);
    if (!transaction) return res.status(404).json({ message: 'Transaction not found.' });

    transaction.photoBase64 = photoBase64;
    transaction.photoStatus = 'submitted';
    transaction.photoSubmittedAt = new Date();
    await transaction.save();

    res.json(transaction);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
