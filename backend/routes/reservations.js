const express = require('express');
const router = express.Router();

const Reservation = require('../models/Reservation');
const ParkingArea = require('../models/ParkingArea');
const ParkingSpace = require('../models/ParkingSpace');
const { requireRole } = require('../middleware/auth');

// Reservations are restricted to faculty/admin at the backend level — this
// is a hard requirement from the client spec, not just a UI restriction.
// If a student calls this API directly, requireRole rejects it with 403
// before any handler below runs.
router.use(requireRole('faculty', 'admin'));

// POST /api/reservations — reserve one specific available space.
// Body: { spaceId } or { areaId } (first available space in that area).
router.post('/', async (req, res) => {
  try {
    const { spaceId, areaId } = req.body;

    const existingActive = await Reservation.findOne({ user: req.currentUser._id, status: 'ACTIVE' });
    if (existingActive) {
      return res.status(400).json({ message: 'You already have an active reservation.' });
    }

    let space;
    if (spaceId) {
      space = await ParkingSpace.findById(spaceId);
    } else if (areaId) {
      space = await ParkingSpace.findOne({ area: areaId, status: 'available' }).sort({ index: 1 });
    } else {
      return res.status(400).json({ message: 'Provide a spaceId or areaId.' });
    }

    if (!space) return res.status(404).json({ message: 'Parking space not found or none available.' });
    if (space.status !== 'available') {
      return res.status(400).json({ message: 'That parking space is not available.' });
    }

    const area = await ParkingArea.findById(space.area);

    space.status = 'reserved';
    await space.save();

    const reservation = await Reservation.create({
      user: req.currentUser._id,
      area: area._id,
      space: space._id,
      status: 'ACTIVE',
    });

    const populated = await reservation.populate(['area', 'space']);
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/reservations — admin sees all, faculty sees only their own.
router.get('/', async (req, res) => {
  try {
    const filter = req.currentUser.role === 'admin' ? {} : { user: req.currentUser._id };
    const reservations = await Reservation.find(filter)
      .populate(['area', 'space', 'user'])
      .sort({ createdAt: -1 });
    res.json(reservations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/reservations/:id/cancel — owner or admin only.
router.put('/:id/cancel', async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ message: 'Reservation not found.' });

    const isOwner = String(reservation.user) === String(req.currentUser._id);
    if (!isOwner && req.currentUser.role !== 'admin') {
      return res.status(403).json({ message: 'You can only cancel your own reservation.' });
    }

    if (reservation.status !== 'ACTIVE') {
      return res.status(400).json({ message: 'Only an active reservation can be cancelled.' });
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
