const express = require('express');
const router = express.Router();

const User = require('../models/User');
const Reservation = require('../models/Reservation');
const ParkingTransaction = require('../models/ParkingTransaction');
const ParkingSpace = require('../models/ParkingSpace');
const VisitorTicket = require('../models/VisitorTicket');

const { requireRole } = require('../middleware/auth');

const {
  allocateSpaces,
  slotsFor,
  markSpacesOccupied,
  releaseSpaces,
} = require('../utils/capacity');

const {
  nextTicketNumber,
  todayISODate,
} = require('../utils/ticketNumber');

const { VEHICLE_TYPE_KEYS } = require('../utils/vehicleTypes');

router.use(requireRole('guard', 'admin'));

function reservationSpaceIds(reservation) {
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

// Ensures an active reservation contains the correct number
// of consecutive reserved spaces for the registered vehicle.
async function prepareReservationSpaces(reservation, requiredSlots) {
  const area = reservation.area;

  if (!area || !area.isActive) {
    return {
      error: 'The reserved parking area is unavailable.',
    };
  }

  let spaceIds = reservationSpaceIds(reservation);

  if (spaceIds.length === 0) {
    return {
      error: 'The reservation has no assigned parking spaces.',
    };
  }

  let spaces = await ParkingSpace.find({
    _id: { $in: spaceIds },
    area: area._id,
  }).sort({ index: 1 });

  if (spaces.length !== spaceIds.length) {
    return {
      error: 'One or more reserved spaces could not be found.',
    };
  }

  if (spaces.some((space) => space.status !== 'reserved')) {
    return {
      error: 'One or more reserved spaces are no longer available.',
    };
  }

  // Support old reservations that only contain one `space` field.
  // Add the missing spaces after the existing reserved spaces.
  if (spaces.length < requiredSlots) {
    const lastSpace = spaces[spaces.length - 1];

    const missingCount = requiredSlots - spaces.length;

    const candidates = await ParkingSpace.find({
      area: area._id,
      index: {
        $gt: lastSpace.index,
        $lte: lastSpace.index + missingCount,
      },
    }).sort({ index: 1 });

    if (candidates.length !== missingCount) {
      return {
        error: 'This older reservation does not have enough consecutive spaces. Please cancel it and make a new reservation.',
      };
    }

    const claimedIds = [];

    try {
      for (let i = 0; i < candidates.length; i += 1) {
        const candidate = candidates[i];

        if (
          candidate.index !== lastSpace.index + i + 1 ||
          candidate.status !== 'available'
        ) {
          throw new Error('The adjacent parking space is unavailable.');
        }

        const claimed = await ParkingSpace.findOneAndUpdate(
          {
            _id: candidate._id,
            area: area._id,
            status: 'available',
          },
          {
            $set: { status: 'reserved' },
          },
          { new: true }
        );

        if (!claimed) {
          throw new Error('The adjacent parking space is unavailable.');
        }

        claimedIds.push(claimed._id);
      }

      spaceIds = [
        ...spaceIds,
        ...claimedIds.map(String),
      ];

      reservation.spaces = spaceIds;
      await reservation.save();

      spaces = await ParkingSpace.find({
        _id: { $in: spaceIds },
        area: area._id,
      }).sort({ index: 1 });
    } catch (err) {
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

      return { error: err.message };
    }
  }

  if (spaces.length !== requiredSlots) {
    return {
      error: `This reservation contains ${spaces.length} space(s), but this vehicle requires ${requiredSlots}. Please cancel and make a new reservation.`,
    };
  }

  for (let i = 0; i < spaces.length; i += 1) {
    if (
      spaces[i].index !== spaces[0].index + i ||
      spaces[i].status !== 'reserved'
    ) {
      return {
        error: 'The reserved spaces are not consecutive or are no longer available.',
      };
    }
  }

  return { area, spaces };
}

// POST /api/guard/scan
router.post('/scan', async (req, res) => {
  try {
    const { qrToken, studentId } = req.body;

    if (!qrToken && !studentId) {
      return res.status(400).json({
        message: 'Provide a qrToken or studentId to scan.',
      });
    }

    const user = qrToken
      ? await User.findOne({ qrToken })
      : await User.findOne({ studentId });

    if (!user) {
      return res.status(404).json({
        message: 'QR code not registered. Verify the vehicle manually before allowing entry.',
      });
    }

    if (!['student', 'faculty'].includes(user.role)) {
      return res.status(403).json({
        message: 'Only student and faculty accounts can use registered parking entry.',
      });
    }

    if (
      user.approvalStatus &&
      user.approvalStatus !== 'approved'
    ) {
      return res.status(403).json({
        message: 'This account is not approved for parking entry.',
      });
    }

    const effectivePlate = (
      user.vehicle?.plateNumber || ''
    ).trim().toUpperCase();

    const effectiveVehicleType = user.vehicle?.vehicleType;

    if (!effectivePlate) {
      return res.status(400).json({
        message: 'No registered plate number was found for this user. Update the vehicle profile first.',
      });
    }

    if (
      !effectiveVehicleType ||
      !VEHICLE_TYPE_KEYS.includes(effectiveVehicleType)
    ) {
      return res.status(400).json({
        message: 'No valid registered vehicle type was found for this user.',
      });
    }

    const existingActive = await ParkingTransaction.findOne({
      plateNumber: effectivePlate,
      status: 'ACTIVE',
    });

    if (existingActive) {
      return res.status(400).json({
        message: 'This vehicle already has an active parking transaction.',
      });
    }

    const requiredSlots = slotsFor(effectiveVehicleType);

    const reservation = await Reservation.findOne({
      user: user._id,
      status: 'ACTIVE',
    }).populate([
      'space',
      'spaces',
      'area',
    ]);

    let area;
    let spaces;

    if (reservation) {
      const prepared = await prepareReservationSpaces(
        reservation,
        requiredSlots
      );

      if (prepared.error) {
        return res.status(409).json({
          message: prepared.error,
        });
      }

      area = prepared.area;
      spaces = prepared.spaces;
    } else {
      const allocation = await allocateSpaces(
        effectiveVehicleType
      );

      if (!allocation) {
        return res.status(409).json({
          message: 'No available parking space at this time.',
        });
      }

      area = allocation.area;
      spaces = allocation.spaces;
    }

    const transaction = await ParkingTransaction.create({
      subjectType: 'student',
      user: user._id,
      plateNumber: effectivePlate,
      vehicleType: effectiveVehicleType,
      vehicleTypeOther:
        effectiveVehicleType === 'other'
          ? user.vehicle?.vehicleTypeOther || ''
          : '',
      slotEquivalent: requiredSlots,
      area: area._id,
      spaces: spaces.map((space) => space._id),
      entryTime: new Date(),
      status: 'ACTIVE',
    });

    await markSpacesOccupied(
      spaces.map((space) => space._id),
      transaction._id
    );

    if (reservation) {
      reservation.status = 'FULFILLED';
      await reservation.save();
    }

    const populated = await transaction.populate([
      'area',
      'spaces',
      'user',
    ]);

    return res.status(201).json(populated);
  } catch (err) {
    console.error('Guard scan error:', err);

    return res.status(500).json({
      message: 'Unable to process the parking entry.',
    });
  }
});

// POST /api/guard/exit
router.post('/exit', async (req, res) => {
  try {
    const { qrToken, studentId, plateNumber } = req.body;

    let transaction;

    if (plateNumber) {
      transaction = await ParkingTransaction.findOne({
        plateNumber: plateNumber.trim().toUpperCase(),
        status: 'ACTIVE',
      });
    } else {
      if (!qrToken && !studentId) {
        return res.status(400).json({
          message: 'Provide a QR token, student ID, or plate number.',
        });
      }

      const user = qrToken
        ? await User.findOne({ qrToken })
        : await User.findOne({ studentId });

      if (!user) {
        return res.status(404).json({
          message: 'User not found.',
        });
      }

      transaction = await ParkingTransaction.findOne({
        user: user._id,
        status: 'ACTIVE',
      });
    }

    if (!transaction) {
      return res.status(404).json({
        message: 'No active parking transaction found.',
      });
    }

    transaction.exitTime = new Date();
    transaction.status = 'COMPLETED';

    await transaction.save();
    await releaseSpaces(transaction.spaces);

    return res.json(transaction);
  } catch (err) {
    console.error('Guard exit error:', err);

    return res.status(500).json({
      message: 'Unable to complete the parking exit.',
    });
  }
});

// POST /api/guard/visitor
router.post('/visitor', async (req, res) => {
  try {
    const {
      visitorName,
      contactNumber,
      plateNumber,
      vehicleType,
      vehicleTypeOther,
    } = req.body;

    if (!visitorName || !plateNumber || !vehicleType) {
      return res.status(400).json({
        message: 'visitorName, plateNumber and vehicleType are required.',
      });
    }

    if (!VEHICLE_TYPE_KEYS.includes(vehicleType)) {
      return res.status(400).json({
        message: 'Invalid vehicleType.',
      });
    }

    const effectivePlate = plateNumber.trim().toUpperCase();

    const existingActive = await ParkingTransaction.findOne({
      plateNumber: effectivePlate,
      status: 'ACTIVE',
    });

    if (existingActive) {
      return res.status(400).json({
        message: 'This vehicle already has an active parking transaction.',
      });
    }

    const allocation = await allocateSpaces(vehicleType);

    if (!allocation) {
      return res.status(409).json({
        message: 'No available parking space at this time.',
      });
    }

    const ticketNumber = await nextTicketNumber();

    const ticket = await VisitorTicket.create({
      ticketNumber,
      visitorName,
      contactNumber,
      plateNumber: effectivePlate,
      vehicleType,
      vehicleTypeOther:
        vehicleType === 'other'
          ? vehicleTypeOther || ''
          : '',
      dateIssued: todayISODate(),
      entryTime: new Date(),
      area: allocation.area._id,
      status: 'ACTIVE',
    });

    const transaction = await ParkingTransaction.create({
      subjectType: 'visitor',
      visitorTicket: ticket._id,
      plateNumber: effectivePlate,
      vehicleType,
      vehicleTypeOther:
        vehicleType === 'other'
          ? vehicleTypeOther || ''
          : '',
      slotEquivalent: slotsFor(vehicleType),
      area: allocation.area._id,
      spaces: allocation.spaces.map((space) => space._id),
      entryTime: new Date(),
      status: 'ACTIVE',
    });

    await markSpacesOccupied(
      allocation.spaces.map((space) => space._id),
      transaction._id
    );

    const populatedTicket = await ticket.populate('area');

    const populatedTransaction = await transaction.populate([
      'area',
      'spaces',
    ]);

    return res.status(201).json({
      ticket: populatedTicket,
      transaction: populatedTransaction,
    });
  } catch (err) {
    console.error('Visitor entry error:', err);

    return res.status(500).json({
      message: 'Unable to register the visitor entry.',
    });
  }
});

// POST /api/guard/visitor/exit
router.post('/visitor/exit', async (req, res) => {
  try {
    const { ticketNumber } = req.body;

    if (!ticketNumber) {
      return res.status(400).json({
        message: 'ticketNumber is required.',
      });
    }

    const ticket = await VisitorTicket.findOne({
      ticketNumber,
    });

    if (!ticket) {
      return res.status(404).json({
        message: 'Visitor ticket not found.',
      });
    }

    const transaction = await ParkingTransaction.findOne({
      visitorTicket: ticket._id,
      status: 'ACTIVE',
    });

    if (ticket.dateIssued !== todayISODate()) {
      ticket.status = 'EXPIRED';
      await ticket.save();

      if (transaction) {
        transaction.status = 'COMPLETED';
        transaction.exitTime = new Date();

        await transaction.save();
        await releaseSpaces(transaction.spaces);
      }

      return res.status(410).json({
        message: 'Visitor ticket has expired (not valid for today).',
        ticket,
      });
    }

    if (!transaction) {
      return res.status(404).json({
        message: 'No active parking transaction for this ticket.',
      });
    }

    transaction.status = 'COMPLETED';
    transaction.exitTime = new Date();

    await transaction.save();
    await releaseSpaces(transaction.spaces);

    ticket.status = 'COMPLETED';
    ticket.exitTime = new Date();

    await ticket.save();

    return res.json({
      ticket,
      transaction,
    });
  } catch (err) {
    console.error('Visitor exit error:', err);

    return res.status(500).json({
      message: 'Unable to complete the visitor exit.',
    });
  }
});

module.exports = router;