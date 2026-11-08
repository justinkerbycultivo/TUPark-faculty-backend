const express = require('express');
const router = express.Router();

const Announcement = require('../models/Announcement');
const ParkingTransaction = require('../models/ParkingTransaction');
const { requireRole } = require('../middleware/auth');

// POST /api/announcements — admin only. Snapshots the plate numbers of
// every currently-active transaction in the affected area at creation time.
router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const { title, area, reason, requiredAction } = req.body;
    if (!title || !area || !reason) {
      return res.status(400).json({ message: 'title, area and reason are required.' });
    }

    const activeInArea = await ParkingTransaction.find({ area, status: 'ACTIVE' }).select('plateNumber');
    const affectedPlateNumbers = activeInArea.map((t) => t.plateNumber);

    const announcement = await Announcement.create({
      title,
      area,
      reason,
      requiredAction: requiredAction || '',
      affectedPlateNumbers,
    });

    const populated = await announcement.populate('area');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/announcements — public, newest first, capped at 50.
router.get('/', async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .populate('area')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
