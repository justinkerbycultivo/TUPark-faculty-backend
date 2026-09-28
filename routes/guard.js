const express = require('express');
const router = express.Router();
const { requireRole } = require('../middleware/auth');

const User = require('../models/User');
const ParkingArea = require('../models/ParkingArea');
const ParkingSpace = require('../models/ParkingSpace');
const ParkingTransaction = require('../models/ParkingTransaction');
const VisitorTicket = require('../models/VisitorTicket');
const Reservation = require('../models/Reservation');
const {
  slotsFor,
  allocateSpaces,
  markSpacesOccupied,
  releaseSpaces,
} = require('../utils/capacity');

// Every route in this file requires a guard (or admin) account.
router.use(requireRole('guard', 'admin'));

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

async function nextTicketNumber() {
  const today = todayString();
  const prefix = `VIS-${today.replace(/-/g, '')}`;
  const countToday = await VisitorTicket.countDocuments({ dateIssued: today });
  const seq = String(countToday + 1).padStart(3, '0');
  return `${prefix}-${seq}`;
}

function studentInfo(user) {
  return {
    formattedName: user.formattedName(),
    studentId: user.studentId,
    email: user.email,
    plateNumber: user.vehicle.plateNumber,
    vehicleType: user.vehicle.vehicleType,
    role: user.role,
  };
}

// ---------- STUDENT/FACULTY ENTRY ----------
router.post('/scan', async (req, res) => {
  try {
    const { qrToken } = req.body;

    if (!qrToken) {
      return res.status(400).json({
        message: 'No QR code data received',
      });
    }

    const user = await User.findOne({ qrToken });

    if (!user) {
      return res.status(404).json({
        message: 'This QR code is not registered in TUPark.',
      });
    }

    const existing = await ParkingTransaction.findOne({
      plateNumber: user.vehicle.plateNumber,
      status: 'ACTIVE',
    }).populate('area');

    if (existing) {
      return res.status(409).json({
        message: `${user.formattedName()}'s vehicle is already checked in at ${existing.area.name}.`,
        alreadyParked: true,
        student: studentInfo(user),
        assignedArea: existing.area,
      });
    }

    // Faculty/admin with an ACTIVE reservation get their reserved space
    // instead of the normal parking pool.
    const reservation = await Reservation.findOne({
      user: user._id,
      status: 'ACTIVE',
    })
      .populate('area')
      .populate('space');

    let area;
    let spaces;

    if (reservation) {
      area = reservation.area;
      spaces = [reservation.space];
    } else {
      // ---------- TEMPORARY DIAGNOSTIC ----------
      const activeAreas = await ParkingArea.find({
        isActive: true,
      }).sort({ name: 1 });

      console.log('');
      console.log('========== TUPARK PARKING DEBUG ==========');
      console.log('[DEBUG] Vehicle type:', user.vehicle.vehicleType);
      console.log('[DEBUG] Plate number:', user.vehicle.plateNumber);
      console.log('[DEBUG] Active parking areas:', activeAreas.length);

      for (const parkingArea of activeAreas) {
        const freeSpaces = await ParkingSpace.countDocuments({
          area: parkingArea._id,
          status: 'available',
        });

        const occupiedSpaces = await ParkingSpace.countDocuments({
          area: parkingArea._id,
          status: 'occupied',
        });

        const reservedSpaces = await ParkingSpace.countDocuments({
          area: parkingArea._id,
          status: 'reserved',
        });

        console.log(
          `[DEBUG] ${parkingArea.name} | ` +
          `code=${parkingArea.code} | ` +
          `capacity=${parkingArea.capacity} | ` +
          `free=${freeSpaces} | ` +
          `occupied=${occupiedSpaces} | ` +
          `reserved=${reservedSpaces} | ` +
          `isActive=${parkingArea.isActive}`
        );
      }

      const found = await allocateSpaces(
        ParkingArea,
        user.vehicle.vehicleType
      );

      if (!found) {
        console.log('[DEBUG] ALLOCATION FAILED');
        console.log('==========================================');
        console.log('');

        return res.status(409).json({
          message: 'No available parking capacity right now.',
          noSpaceAvailable: true,
          student: studentInfo(user),
        });
      }

      console.log(
        '[DEBUG] ALLOCATION SUCCESS:',
        found.area.name
      );

      console.log(
        '[DEBUG] Assigned spaces:',
        found.spaces.map((space) => space.code)
      );

      console.log('==========================================');
      console.log('');

      area = found.area;
      spaces = found.spaces;
    }

    const slots = slotsFor(user.vehicle.vehicleType);

    const transaction = await ParkingTransaction.create({
      subjectType: 'student',
      user: user._id,
      plateNumber: user.vehicle.plateNumber,
      vehicleType: user.vehicle.vehicleType,
      slotEquivalent: slots,
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

    res.status(201).json({
      message:
        `Welcome, ${user.formattedName()}! ` +
        `Assigned to ${area.name}, ` +
        `space ${spaces.map((space) => space.code).join(' & ')}.`,
      student: studentInfo(user),
      assignedArea: area,
      assignedSpaces: spaces,
      transaction,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'This vehicle already has an active parking session.',
      });
    }

    console.error('Guard scan error:', error);

    res.status(500).json({
      message: 'Server error',
    });
  }
});

// ---------- STUDENT/FACULTY EXIT ----------
router.post('/exit', async (req, res) => {
  try {
    const { qrToken } = req.body;

    if (!qrToken) {
      return res.status(400).json({
        message: 'No QR code data received',
      });
    }

    const user = await User.findOne({ qrToken });

    if (!user) {
      return res.status(404).json({
        message: 'This QR code is not registered in TUPark.',
      });
    }

    const transaction = await ParkingTransaction.findOne({
      user: user._id,
      status: 'ACTIVE',
    }).populate('area');

    if (!transaction) {
      return res.status(404).json({
        message: `${user.formattedName()} has no active parking session.`,
      });
    }

    transaction.exitTime = new Date();
    transaction.status = 'COMPLETED';

    await transaction.save();

    await releaseSpaces(transaction.spaces);

    res.json({
      message:
        `${user.formattedName()}'s vehicle has exited ` +
        `${transaction.area.name}. Space released.`,
      transaction,
    });
  } catch (error) {
    console.error('Guard exit error:', error);

    res.status(500).json({
      message: 'Server error',
    });
  }
});

// ---------- VISITOR ENTRY ----------
router.post('/visitor', async (req, res) => {
  try {
    const {
      visitorName,
      contactNumber,
      plateNumber,
      vehicleType,
    } = req.body;

    if (
      !visitorName ||
      !contactNumber ||
      !plateNumber ||
      !vehicleType
    ) {
      return res.status(400).json({
        message: 'Please fill in all visitor fields',
      });
    }

    if (!['car', 'motorcycle'].includes(vehicleType)) {
      return res.status(400).json({
        message: 'Vehicle type must be car or motorcycle',
      });
    }

    const normalizedPlate = plateNumber.trim().toUpperCase();

    const existing = await ParkingTransaction.findOne({
      plateNumber: normalizedPlate,
      status: 'ACTIVE',
    }).populate('area');

    if (existing) {
      return res.status(409).json({
        message:
          `This vehicle is already checked in at ${existing.area.name}.`,
        alreadyParked: true,
        assignedArea: existing.area,
      });
    }

    const found = await allocateSpaces(
      ParkingArea,
      vehicleType
    );

    if (!found) {
      return res.status(409).json({
        message: 'No available parking capacity right now.',
        noSpaceAvailable: true,
      });
    }

    const { area, spaces } = found;

    const ticketNumber = await nextTicketNumber();

    const ticket = await VisitorTicket.create({
      ticketNumber,
      visitorName,
      contactNumber,
      plateNumber: normalizedPlate,
      vehicleType,
      dateIssued: todayString(),
      entryTime: new Date(),
      area: area._id,
      status: 'ACTIVE',
    });

    const transaction = await ParkingTransaction.create({
      subjectType: 'visitor',
      visitorTicket: ticket._id,
      plateNumber: normalizedPlate,
      vehicleType,
      slotEquivalent: slotsFor(vehicleType),
      area: area._id,
      spaces: spaces.map((space) => space._id),
      entryTime: new Date(),
      status: 'ACTIVE',
    });

    await markSpacesOccupied(
      spaces.map((space) => space._id),
      transaction._id
    );

    res.status(201).json({
      message:
        `Visitor ticket ${ticketNumber} issued. ` +
        `Assigned to ${area.name}, ` +
        `space ${spaces.map((space) => space.code).join(' & ')}.`,
      ticket,
      assignedArea: area,
      assignedSpaces: spaces,
      transaction,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'This vehicle already has an active parking session.',
      });
    }

    console.error('Guard visitor entry error:', error);

    res.status(500).json({
      message: 'Server error',
    });
  }
});

// ---------- VISITOR EXIT ----------
router.post('/visitor/exit', async (req, res) => {
  try {
    const { ticketNumber } = req.body;

    if (!ticketNumber) {
      return res.status(400).json({
        message: 'No ticket number provided',
      });
    }

    const ticket = await VisitorTicket.findOne({
      ticketNumber,
    });

    if (!ticket) {
      return res.status(404).json({
        message: 'Visitor ticket not found',
      });
    }

    if (
      ticket.dateIssued !== todayString() &&
      ticket.status === 'ACTIVE'
    ) {
      ticket.status = 'EXPIRED';

      await ticket.save();

      return res.status(410).json({
        message:
          'This visitor ticket has expired (valid for one day only).',
      });
    }

    if (ticket.status !== 'ACTIVE') {
      return res.status(409).json({
        message:
          `This ticket is already ${ticket.status.toLowerCase()}.`,
      });
    }

    const transaction = await ParkingTransaction.findOne({
      visitorTicket: ticket._id,
      status: 'ACTIVE',
    }).populate('area');

    if (!transaction) {
      return res.status(404).json({
        message: 'No active parking session for this ticket.',
      });
    }

    transaction.exitTime = new Date();
    transaction.status = 'COMPLETED';

    await transaction.save();

    await releaseSpaces(transaction.spaces);

    ticket.exitTime = new Date();
    ticket.status = 'COMPLETED';

    await ticket.save();

    res.json({
      message:
        `Visitor ${ticket.visitorName} has exited ` +
        `${transaction.area.name}. Space released.`,
      transaction,
      ticket,
    });
  } catch (error) {
    console.error('Guard visitor exit error:', error);

    res.status(500).json({
      message: 'Server error',
    });
  }
});

module.exports = router;