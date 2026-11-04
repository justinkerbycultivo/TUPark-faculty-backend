const express = require('express');
const router = express.Router();

const User = require('../models/User');
const ParkingArea = require('../models/ParkingArea');
const ParkingTransaction = require('../models/ParkingTransaction');
const VisitorTicket = require('../models/VisitorTicket');
const ViolationReport = require('../models/ViolationReport');
const { requireRole } = require('../middleware/auth');
const { releaseSpaces } = require('../utils/capacity');
const { todayISODate } = require('../utils/ticketNumber');

router.use(requireRole('admin'));

// POST /api/admin/checkout/:transactionId — manual admin checkout.
router.post('/checkout/:transactionId', async (req, res) => {
  try {
    const transaction = await ParkingTransaction.findById(req.params.transactionId);
    if (!transaction) return res.status(404).json({ message: 'Transaction not found.' });
    if (transaction.status !== 'ACTIVE') {
      return res.status(400).json({ message: 'This transaction is not active.' });
    }

    transaction.status = 'COMPLETED';
    transaction.exitTime = new Date();
    await transaction.save();

    await releaseSpaces(transaction.spaces);

    if (transaction.visitorTicket) {
      await VisitorTicket.findByIdAndUpdate(transaction.visitorTicket, {
        status: 'COMPLETED',
        exitTime: new Date(),
      });
    }

    res.json(transaction);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/overview — live DB aggregates only, never hardcoded.
router.get('/overview', async (req, res) => {
  try {
    const areas = await ParkingArea.find();
    const activeAreas = areas.filter((a) => a.isActive);
    const totalCapacity = areas.reduce((sum, a) => sum + a.capacity, 0);

    const activeTransactions = await ParkingTransaction.find({ status: 'ACTIVE' });
    const occupiedSlots = activeTransactions.reduce((sum, t) => sum + (t.slotEquivalent || 0), 0);

    const vehicleTypeCounts = {};
    for (const t of activeTransactions) {
      vehicleTypeCounts[t.vehicleType] = (vehicleTypeCounts[t.vehicleType] || 0) + 1;
    }

    const studentCount = await User.countDocuments({ role: 'student' });

    const recentEntries = await ParkingTransaction.find()
      .sort({ entryTime: -1 })
      .limit(10)
      .populate(['area', 'user', 'visitorTicket']);

    const recentExits = await ParkingTransaction.find({ status: 'COMPLETED' })
      .sort({ exitTime: -1 })
      .limit(10)
      .populate(['area', 'user', 'visitorTicket']);

    const photosSubmittedCount = await ParkingTransaction.countDocuments({ photoStatus: 'submitted' });
    const pendingViolationsCount = await ViolationReport.countDocuments({ status: 'Pending' });
    const recentViolations = await ViolationReport.find().sort({ createdAt: -1 }).limit(10);

    const visitorTicketsToday = await VisitorTicket.countDocuments({ dateIssued: todayISODate() });

    res.json({
      activeAreaCount: activeAreas.length,
      totalAreaCount: areas.length,
      totalCapacity,
      occupiedSlots,
      remainingSlots: Math.max(totalCapacity - occupiedSlots, 0),
      vehicleTypeCounts,
      studentCount,
      activeTransactionCount: activeTransactions.length,
      recentEntries,
      recentExits,
      photosSubmittedCount,
      pendingViolationsCount,
      recentViolations,
      visitorTicketsToday,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/users — students only, passwordHash excluded.
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({ role: 'student' }).select('-passwordHash').sort({ surname: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/visitors
router.get('/visitors', async (req, res) => {
  try {
    const tickets = await VisitorTicket.find().populate('area').sort({ createdAt: -1 });
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/vehicles — derived list of every registered vehicle.
router.get('/vehicles', async (req, res) => {
  try {
    const users = await User.find({ 'vehicle.plateNumber': { $exists: true, $ne: null } }).select('-passwordHash');
    const activeTransactions = await ParkingTransaction.find({ status: 'ACTIVE' });
    const activePlates = new Set(activeTransactions.map((t) => t.plateNumber));

    const vehicles = users.map((u) => ({
      owner: u.formattedName(),
      studentId: u.studentId,
      plateNumber: u.vehicle.plateNumber,
      vehicleType: u.vehicle.vehicleType,
      vehicleTypeOther: u.vehicle.vehicleTypeOther,
      status: activePlates.has(u.vehicle.plateNumber) ? 'Parked' : 'Not Parked',
    }));

    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/photos — submitted parking photos.
router.get('/photos', async (req, res) => {
  try {
    const transactions = await ParkingTransaction.find({ photoStatus: 'submitted' })
      .populate(['area', 'user'])
      .sort({ photoSubmittedAt: -1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    await user.deleteOne();
    res.json({ message: 'User deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ---------------------------------------------------------------------------
// Guard registration approvals
// ---------------------------------------------------------------------------
// GET /api/admin/guard-requests?status=pending|approved|rejected
router.get('/guard-requests', async (req, res) => {
  try {
    const filter = { role: 'guard' };
    const { status } = req.query;
    if (status === 'pending' || status === 'rejected') filter.approvalStatus = status;
    else if (status === 'approved') filter.approvalStatus = { $in: ['approved', null] };
    const guards = await User.find(filter).select('-passwordHash').sort({ createdAt: -1 });
    res.json(
      guards.map((g) => ({
        _id: g._id,
        formattedName: g.formattedName(),
        studentId: g.studentId,
        email: g.email,
        contactNumber: g.contactNumber,
        approvalStatus: g.approvalStatus || 'approved',
        createdAt: g.createdAt,
      }))
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

async function setGuardStatus(req, res, status) {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
      return res.status(400).json({ message: 'Invalid account id.' });
    }
    const guard = await User.findById(req.params.id);
    if (!guard || guard.role !== 'guard') {
      return res.status(404).json({ message: 'Guard account not found.' });
    }
    guard.approvalStatus = status;
    await guard.save();
    res.json({ message: `Guard account ${status}.`, _id: guard._id, approvalStatus: status });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

router.post('/guards/:id/approve', (req, res) => setGuardStatus(req, res, 'approved'));
router.post('/guards/:id/reject', (req, res) => setGuardStatus(req, res, 'rejected'));

module.exports = router;
