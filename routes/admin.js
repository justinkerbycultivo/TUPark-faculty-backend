const express = require('express');
const router = express.Router();
const { requireRole } = require('../middleware/auth');

const User = require('../models/User');
const ParkingArea = require('../models/ParkingArea');
const ParkingTransaction = require('../models/ParkingTransaction');
const VisitorTicket = require('../models/VisitorTicket');
const ViolationReport = require('../models/ViolationReport');
const { releaseSpaces } = require('../utils/capacity');

// Every route in this file is admin-only.
router.use(requireRole('admin'));

// POST /api/admin/checkout/:transactionId -> admin manually checks a
// vehicle out (no QR needed), same effect as a guard exit scan.
router.post('/checkout/:transactionId', async (req, res) => {
  try {
    const transaction = await ParkingTransaction.findById(req.params.transactionId).populate('area');
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    if (transaction.status !== 'ACTIVE') {
      return res.status(409).json({ message: 'This vehicle is not currently parked.' });
    }

    transaction.exitTime = new Date();
    transaction.status = 'COMPLETED';
    await transaction.save();
    await releaseSpaces(transaction.spaces);

    // If this was a visitor, close their ticket too.
    if (transaction.subjectType === 'visitor' && transaction.visitorTicket) {
      await VisitorTicket.findByIdAndUpdate(transaction.visitorTicket, {
        status: 'COMPLETED',
        exitTime: transaction.exitTime,
      });
    }

    res.json({ message: `Checked out from ${transaction.area.name}. Space released.`, transaction });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

// GET /api/admin/overview -> real, database-driven dashboard stats
router.get('/overview', async (req, res) => {
  try {
    const areas = await ParkingArea.find();
    const totalAreas = areas.length;
    const activeAreas = areas.filter((a) => a.isActive).length;
    const totalCapacity = areas.reduce((sum, a) => sum + a.capacity, 0);

    const activeTransactions = await ParkingTransaction.find({ status: 'ACTIVE' });
    const occupiedCapacity = activeTransactions.reduce((sum, t) => sum + t.slotEquivalent, 0);
    const carsParked = activeTransactions.filter((t) => t.vehicleType === 'car').length;
    const motorcyclesParked = activeTransactions.filter((t) => t.vehicleType === 'motorcycle').length;

    const totalStudents = await User.countDocuments({ role: 'student' });

    const recentEntries = await ParkingTransaction.find()
      .sort({ entryTime: -1 })
      .limit(5)
      .populate('area')
      .populate('user', 'surname givenName studentId');

    const recentExits = await ParkingTransaction.find({ status: 'COMPLETED' })
      .sort({ exitTime: -1 })
      .limit(5)
      .populate('area')
      .populate('user', 'surname givenName studentId');

    const photosSubmitted = await ParkingTransaction.countDocuments({ photoStatus: 'submitted' });

    const pendingViolations = await ViolationReport.countDocuments({ status: 'Pending' });
    const recentViolations = await ViolationReport.find().sort({ createdAt: -1 }).limit(5);

    const visitorTicketsToday = await VisitorTicket.countDocuments({ dateIssued: todayString() });

    res.json({
      totalAreas,
      activeAreas,
      totalCapacity,
      occupiedCapacity,
      remainingCapacity: Math.max(0, totalCapacity - occupiedCapacity),
      carsParked,
      motorcyclesParked,
      totalStudents,
      activeTransactionsCount: activeTransactions.length,
      recentEntries,
      recentExits,
      photosSubmitted,
      pendingViolations,
      recentViolations,
      visitorTicketsToday,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/users -> all students (Students table)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({ role: 'student' }).select('-passwordHash').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/visitors -> visitor ticket history (Visitors table)
router.get('/visitors', async (req, res) => {
  try {
    const tickets = await VisitorTicket.find().populate('area').sort({ createdAt: -1 });
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/vehicles -> derived Vehicles table (plate, owner, type, status)
router.get('/vehicles', async (req, res) => {
  try {
    const users = await User.find({ role: 'student' }).select('surname givenName middleName vehicle');
    const activePlates = new Set(
      (await ParkingTransaction.find({ status: 'ACTIVE' }).select('plateNumber')).map((t) => t.plateNumber)
    );

    const vehicles = users.map((u) => ({
      plateNumber: u.vehicle.plateNumber,
      owner: u.formattedName(),
      vehicleType: u.vehicle.vehicleType,
      status: activePlates.has(u.vehicle.plateNumber) ? 'Parked' : 'Not Parked',
      userId: u._id,
    }));

    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/photos -> Parking Photos gallery (submitted only)
router.get('/photos', async (req, res) => {
  try {
    const photos = await ParkingTransaction.find({ photoStatus: 'submitted' })
      .populate('area')
      .populate('user', 'surname givenName middleName studentId')
      .sort({ photoSubmittedAt: -1 });
    res.json(photos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
