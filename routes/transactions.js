const express = require('express');
const router = express.Router();
const ParkingTransaction = require('../models/ParkingTransaction');

// GET /api/transactions -> full history (admin), newest first
router.get('/', async (req, res) => {
  try {
    const transactions = await ParkingTransaction.find()
      .populate('area')
      .populate('spaces')
      .populate('user', 'surname givenName middleName studentId email')
      .populate('visitorTicket')
      .sort({ createdAt: -1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/transactions/active -> only currently-parked vehicles (admin)
router.get('/active', async (req, res) => {
  try {
    const transactions = await ParkingTransaction.find({ status: 'ACTIVE' })
      .populate('area')
      .populate('spaces')
      .populate('user', 'surname givenName middleName studentId email')
      .populate('visitorTicket')
      .sort({ entryTime: -1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/transactions/student/:userId -> one student's current + past transactions
router.get('/student/:userId', async (req, res) => {
  try {
    const transactions = await ParkingTransaction.find({ user: req.params.userId })
      .populate('area')
      .populate('spaces')
      .sort({ createdAt: -1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/transactions/:id/photo -> Week 10: submit parking photo for an active transaction
router.post('/:id/photo', async (req, res) => {
  try {
    const { photoBase64 } = req.body;
    if (!photoBase64) {
      return res.status(400).json({ message: 'No photo data received' });
    }
    const transaction = await ParkingTransaction.findById(req.params.id);
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

    transaction.photoBase64 = photoBase64;
    transaction.photoStatus = 'submitted';
    transaction.photoSubmittedAt = new Date();
    await transaction.save();

    res.json({ message: 'Photo submitted', transaction });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
