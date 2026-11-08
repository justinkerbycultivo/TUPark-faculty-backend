const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const Reservation = require('../models/Reservation');
const ParkingArea = require('../models/ParkingArea');
const ParkingSpace = require('../models/ParkingSpace');
const { requireRole } = require('../middleware/auth');
const { slotsFor } = require('../utils/capacity');

router.use(requireRole('faculty', 'admin'));

function getReservationSpaceIds(reservation) {
  const ids = Array.isArray(reservation.spaces)
    ? reservation.spaces.map((space) =>
        String(space?._id || space)
      )
    : [];

  if (ids.length > 0) return [...new Set(ids)];

  if (reservation.space) {
    return [String(reservation.space._id || reservation.space)];
  }

  return [];
}

// POST /api/reservations
router.post('/', async (req, res) => {
  const claimedIds = [];

  try {
    const { spaceId } = req.body;

    if (!spaceId || !mongoose.Types.ObjectId.isValid(spaceId)) {
      return res.status(400).json({
        message: 'A valid parking space is required.',
      });
    }

    const existingReservation = await Reservation.findOne({
      user: req.currentUser._id,
      status: 'ACTIVE',
    });

    if (existingReservation) {
      return res.status(409).json({
        message: 'You already have an active reservation. Cancel it first before making another one.',
      });
    }

    const vehicleType = req.currentUser.vehicle?.vehicleType;

    if (!vehicleType) {
      return res.status(400).json({
        message: 'Please register your vehicle before making a reservation.',
      });
    }

    const requiredSlots = slotsFor(vehicleType);

    const selectedSpace = await ParkingSpace.findById(spaceId);

    if (!selectedSpace) {
      return res.status(404).json({
        message: 'Selected parking space was not found.',
      });
    }

    if (selectedSpace.status !== 'available') {
      return res.status(409).json({
        message: 'This parking space is no longer available.',
      });
    }

    const area = await ParkingArea.findById(selectedSpace.area);

    if (!area || !area.isActive) {
      return res.status(409).json({
        message: 'This parking area is currently unavailable.',
      });
    }

    const areaSpaces = await ParkingSpace.find({
      area: area._id,
    }).sort({ index: 1 });

    const startIndex = areaSpaces.findIndex(
      (space) => String(space._id) === String(selectedSpace._id)
    );

    if (startIndex < 0) {
      return res.status(404).json({
        message: 'Selected space does not belong to this parking area.',
      });
    }

    const requiredSpaces = areaSpaces.slice(
      startIndex,
      startIndex + requiredSlots
    );

    if (requiredSpaces.length !== requiredSlots) {
      return res.status(409).json({
        message: `This vehicle requires ${requiredSlots} consecutive parking space(s), but there is not enough room after the selected space.`,
      });
    }

    // Ensure the spaces are consecutive and all available.
    for (let i = 0; i < requiredSpaces.length; i += 1) {
      const expectedIndex = selectedSpace.index + i;
      const space = requiredSpaces[i];

      if (
        space.index !== expectedIndex ||
        space.status !== 'available'
      ) {
        return res.status(409).json({
          message: 'The selected space does not have enough consecutive available spaces for your vehicle.',
        });
      }
    }

    // Atomically claim every required space.
    for (const space of requiredSpaces) {
      const claimed = await ParkingSpace.findOneAndUpdate(
        {
          _id: space._id,
          area: area._id,
          status: 'available',
        },
        {
          $set: { status: 'reserved' },
        },
        { new: true }
      );

      if (!claimed) {
        throw new Error(
          'One of the selected spaces was reserved by another user. Please select another space.'
        );
      }

      claimedIds.push(claimed._id);
    }

    const reservation = await Reservation.create({
      user: req.currentUser._id,
      area: area._id,
      space: requiredSpaces[0]._id,
      spaces: requiredSpaces.map((space) => space._id),
      status: 'ACTIVE',
    });

    const populated = await reservation.populate([
      'area',
      'space',
      'spaces',
      'user',
    ]);

    return res.status(201).json(populated);
  } catch (err) {
    // Release only spaces successfully claimed by this request.
    if (claimedIds.length > 0) {
      await ParkingSpace.updateMany(
        {
          _id: { $in: claimedIds },
          status: 'reserved',
        },
        {
          $set: { status: 'available' },
        }
      );
    }

    if (
      err.message &&
      err.message.includes('reserved by another user')
    ) {
      return res.status(409).json({ message: err.message });
    }

    console.error('Create reservation error:', err);

    return res.status(500).json({
      message: 'Unable to create the parking reservation.',
    });
  }
});

// GET /api/reservations
router.get('/', async (req, res) => {
  try {
    const filter =
      req.currentUser.role === 'admin'
        ? {}
        : { user: req.currentUser._id };

    const reservations = await Reservation.find(filter)
      .populate('area')
      .populate('space')
      .populate('spaces')
      .populate('user')
      .sort({ createdAt: -1 });

    return res.json(reservations);
  } catch (err) {
    console.error('Get reservations error:', err);

    return res.status(500).json({
      message: 'Unable to retrieve reservations.',
    });
  }
});

// PUT /api/reservations/:id/cancel
router.put('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid reservation ID.',
      });
    }

    const reservation = await Reservation.findById(id);

    if (!reservation) {
      return res.status(404).json({
        message: 'Reservation not found.',
      });
    }

    const isOwner =
      String(reservation.user) === String(req.currentUser._id);

    const isAdmin = req.currentUser.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: 'You are not authorized to cancel this reservation.',
      });
    }

    if (reservation.status !== 'ACTIVE') {
      return res.status(400).json({
        message: 'Only active reservations can be cancelled.',
      });
    }

    const spaceIds = getReservationSpaceIds(reservation);

    reservation.status = 'CANCELLED';
    await reservation.save();

    if (spaceIds.length > 0) {
      await ParkingSpace.updateMany(
        {
          _id: { $in: spaceIds },
          status: 'reserved',
        },
        {
          $set: {
            status: 'available',
            currentTransaction: null,
          },
        }
      );
    }

    const populated = await reservation.populate([
      'area',
      'space',
      'spaces',
      'user',
    ]);

    return res.json(populated);
  } catch (err) {
    console.error('Cancel reservation error:', err);

    return res.status(500).json({
      message: 'Unable to cancel the reservation.',
    });
  }
});

module.exports = router;