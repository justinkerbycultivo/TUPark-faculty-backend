const express = require('express');
const router = express.Router();

const ViolationReport = require('../models/ViolationReport');
const { requireRole } = require('../middleware/auth');

// POST /api/violations — anyone can report (student, guard, etc). No role
// restriction: this is intentionally open so any campus user can flag a
// parking violation, per the client spec.
router.post('/', async (req, res) => {
  try {
    const { reportedBy, plateNumber, area, description, photoBase64 } = req.body;

    if (!plateNumber || !description) {
      return res.status(400).json({ message: 'plateNumber and description are required.' });
    }

    const report = await ViolationReport.create({
      reportedBy: reportedBy || null,
      plateNumber: plateNumber.toUpperCase(),
      area: area || null,
      description,
      photoBase64: photoBase64 || null,
    });

    res.status(201).json(report);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/violations — admin only.
router.get('/', requireRole('admin'), async (req, res) => {
  try {
    const reports = await ViolationReport.find()
      .populate(['reportedBy', 'area'])
      .sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/violations/:id/status — admin only.
router.put('/:id/status', requireRole('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['Pending', 'Under Review', 'Resolved', 'Rejected'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${allowed.join(', ')}.` });
    }

    const report = await ViolationReport.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Violation report not found.' });

    report.status = status;
    await report.save();

    res.json(report);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
