const express = require('express');
const router = express.Router();
const { requireRole } = require('../middleware/auth');

const ParkingSpace = require('../models/ParkingSpace');
const Reservation = require('../models/Reservation');

// Everything here requires faculty or admin. A student calling this
// directly (bypassing the UI) gets a hard 403 from requireRole — the rule
// is enforced here, not just by hiding the button in the app.
router.use(requireRole('faculty', 'admin'));

// POST /api/reservations -> reserve one specific available space
router.post('/', async (req, res) => {
  try {
    const { spaceId } = req.body;
    if (!spaceId) return res.status(400).json({ message: 'spaceId is required' });

    const space = await ParkingSpace.findById(spaceId);
    if (!space) return res.status(404).json({ message: 'Parking space not found' });
    if (space.status !== 'available') {
      return res.status(409).json({ message: 'This space is not available to reserve.' });
    }

    const existingForUser = await Reservation.findOne({ user: req.currentUser._id, status: 'ACTIVE' });
    if (existingForUser) {
      return res.status(409).json({ message: 'You already have an active reservation. Cancel it before making a new one.' });
    }

    const reservation = await Reservation.create({
      user: req.currentUser._id,
      area: space.area,
      space: space._id,
      status: 'ACTIVE',
    });

    space.status = 'reserved';
    await space.save();

    const populated = await reservation.populate(['area', 'space']);
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/reservations -> admin sees all, faculty sees only their own
router.get('/', async (req, res) => {
  try {
    const filter = req.currentUser.role === 'admin' ? {} : { user: req.currentUser._id };
    const reservations = await Reservation.find(filter)
      .populate('area')
      .populate('space')
      .populate('user', 'surname givenName middleName studentId email role')
      .sort({ createdAt: -1 });
    res.json(reservations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/reservations/:id/cancel -> the owner, or an admin, can cancel
router.put('/:id/cancel', async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ message: 'Reservation not found' });

    const isOwner = String(reservation.user) === String(req.currentUser._id);
    if (!isOwner && req.currentUser.role !== 'admin') {
      return res.status(403).json({ message: 'You can only cancel your own reservation.' });
    }
    if (reservation.status !== 'ACTIVE') {
      return res.status(409).json({ message: `This reservation is already ${reservation.status.toLowerCase()}.` });
    }

    reservation.status = 'CANCELLED';
    await reservation.save();

    await ParkingSpace.findByIdAndUpdate(reservation.space, { status: 'available' });

    res.json(reservation);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
