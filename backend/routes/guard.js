const express = require('express');
const router = express.Router();

const User = require('../models/User');
const Reservation = require('../models/Reservation');
const ParkingTransaction = require('../models/ParkingTransaction');
const ParkingSpace = require('../models/ParkingSpace');
const VisitorTicket = require('../models/VisitorTicket');
const { requireRole } = require('../middleware/auth');
const { allocateSpaces, slotsFor, markSpacesOccupied, releaseSpaces } = require('../utils/capacity');
const { nextTicketNumber, todayISODate } = require('../utils/ticketNumber');
const { VEHICLE_TYPE_KEYS } = require('../utils/vehicleTypes');

router.use(requireRole('guard', 'admin'));

// POST /api/guard/scan — entry scan for a registered student/faculty user.
router.post('/scan', async (req, res) => {
  try {
    const { qrToken, studentId, plateNumber, vehicleType } = req.body;

    if (!qrToken && !studentId) {
      return res.status(400).json({ message: 'Provide a qrToken or studentId to scan.' });
    }

    const user = qrToken ? await User.findOne({ qrToken }) : await User.findOne({ studentId });

    if (!user) {
      return res.status(404).json({
        message: 'QR code not registered. Verify the vehicle manually before allowing entry.',
      });
    }

    const effectivePlate = (plateNumber || user.vehicle?.plateNumber || '').toUpperCase();
    const effectiveVehicleType = vehicleType || user.vehicle?.vehicleType;

    if (!effectivePlate) {
      return res.status(400).json({ message: 'No plate number on file for this user. Provide one explicitly.' });
    }
    if (!effectiveVehicleType || !VEHICLE_TYPE_KEYS.includes(effectiveVehicleType)) {
      return res.status(400).json({ message: 'Provide a valid vehicleType.' });
    }

    const existingActive = await ParkingTransaction.findOne({
      plateNumber: effectivePlate,
      status: 'ACTIVE',
    });
    if (existingActive) {
      return res.status(400).json({ message: 'This vehicle already has an active parking transaction.' });
    }

    // Prefer a standing reservation for this user, if any.
    const reservation = await Reservation.findOne({ user: user._id, status: 'ACTIVE' }).populate('space area');

    let area;
    let spaces;

    if (reservation) {
      const space = await ParkingSpace.findById(reservation.space._id);
      if (!space || space.status !== 'reserved') {
        return res.status(409).json({ message: 'Reserved space is no longer available. Contact an admin.' });
      }
      area = reservation.area;
      spaces = [space];
    } else {
      const allocation = await allocateSpaces(effectiveVehicleType);
      if (!allocation) {
        return res.status(409).json({ message: 'No available parking space at this time.' });
      }
      area = allocation.area;
      spaces = allocation.spaces;
    }

    const transaction = await ParkingTransaction.create({
      subjectType: 'student',
      user: user._id,
      plateNumber: effectivePlate,
      vehicleType: effectiveVehicleType,
      vehicleTypeOther: effectiveVehicleType === 'other' ? user.vehicle?.vehicleTypeOther || '' : '',
      slotEquivalent: slotsFor(effectiveVehicleType),
      area: area._id,
      spaces: spaces.map((s) => s._id),
      entryTime: new Date(),
      status: 'ACTIVE',
    });

    await markSpacesOccupied(
      spaces.map((s) => s._id),
      transaction._id
    );

    if (reservation) {
      reservation.status = 'FULFILLED';
      await reservation.save();
    }

    const populated = await transaction.populate(['area', 'spaces', 'user']);
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/guard/exit — completes a student/faculty active transaction.
router.post('/exit', async (req, res) => {
  try {
    const { qrToken, studentId, plateNumber } = req.body;

    let transaction;
    if (plateNumber) {
      transaction = await ParkingTransaction.findOne({
        plateNumber: plateNumber.toUpperCase(),
        status: 'ACTIVE',
      });
    } else {
      const user = qrToken ? await User.findOne({ qrToken }) : await User.findOne({ studentId });
      if (!user) return res.status(404).json({ message: 'User not found.' });
      transaction = await ParkingTransaction.findOne({ user: user._id, status: 'ACTIVE' });
    }

    if (!transaction) {
      return res.status(404).json({ message: 'No active parking transaction found.' });
    }

    transaction.exitTime = new Date();
    transaction.status = 'COMPLETED';
    await transaction.save();

    await releaseSpaces(transaction.spaces);

    res.json(transaction);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/guard/visitor — issues a visitor ticket and parks the vehicle.
router.post('/visitor', async (req, res) => {
  try {
    const { visitorName, contactNumber, plateNumber, vehicleType, vehicleTypeOther } = req.body;

    if (!visitorName || !plateNumber || !vehicleType) {
      return res.status(400).json({ message: 'visitorName, plateNumber and vehicleType are required.' });
    }
    if (!VEHICLE_TYPE_KEYS.includes(vehicleType)) {
      return res.status(400).json({ message: 'Invalid vehicleType.' });
    }

    const effectivePlate = plateNumber.toUpperCase();

    const existingActive = await ParkingTransaction.findOne({ plateNumber: effectivePlate, status: 'ACTIVE' });
    if (existingActive) {
      return res.status(400).json({ message: 'This vehicle already has an active parking transaction.' });
    }

    const allocation = await allocateSpaces(vehicleType);
    if (!allocation) {
      return res.status(409).json({ message: 'No available parking space at this time.' });
    }

    const ticketNumber = await nextTicketNumber();

    const ticket = await VisitorTicket.create({
      ticketNumber,
      visitorName,
      contactNumber,
      plateNumber: effectivePlate,
      vehicleType,
      vehicleTypeOther: vehicleType === 'other' ? vehicleTypeOther || '' : '',
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
      vehicleTypeOther: vehicleType === 'other' ? vehicleTypeOther || '' : '',
      slotEquivalent: slotsFor(vehicleType),
      area: allocation.area._id,
      spaces: allocation.spaces.map((s) => s._id),
      entryTime: new Date(),
      status: 'ACTIVE',
    });

    await markSpacesOccupied(
      allocation.spaces.map((s) => s._id),
      transaction._id
    );

    const populatedTicket = await ticket.populate('area');
    res.status(201).json({ ticket: populatedTicket, transaction });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/guard/visitor/exit
router.post('/visitor/exit', async (req, res) => {
  try {
    const { ticketNumber } = req.body;
    if (!ticketNumber) return res.status(400).json({ message: 'ticketNumber is required.' });

    const ticket = await VisitorTicket.findOne({ ticketNumber });
    if (!ticket) return res.status(404).json({ message: 'Visitor ticket not found.' });

    const transaction = await ParkingTransaction.findOne({ visitorTicket: ticket._id, status: 'ACTIVE' });

    if (ticket.dateIssued !== todayISODate()) {
      ticket.status = 'EXPIRED';
      await ticket.save();
      if (transaction) {
        transaction.status = 'COMPLETED';
        transaction.exitTime = new Date();
        await transaction.save();
        await releaseSpaces(transaction.spaces);
      }
      return res.status(410).json({ message: 'Visitor ticket has expired (not valid for today).', ticket });
    }

    if (!transaction) {
      return res.status(404).json({ message: 'No active parking transaction for this ticket.' });
    }

    transaction.status = 'COMPLETED';
    transaction.exitTime = new Date();
    await transaction.save();
    await releaseSpaces(transaction.spaces);

    ticket.status = 'COMPLETED';
    ticket.exitTime = new Date();
    await ticket.save();

    res.json({ ticket, transaction });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
