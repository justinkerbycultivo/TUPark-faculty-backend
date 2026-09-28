const express = require('express');
const router = express.Router();
const ViolationReport = require('../models/ViolationReport');
const { requireRole } = require('../middleware/auth');

// POST /api/violations -> anyone (student app) can report
router.post('/', async (req, res) => {
  try {
    const { reportedBy, plateNumber, area, description, photoBase64 } = req.body;
    if (!plateNumber || !description) {
      return res.status(400).json({ message: 'Plate number and description are required' });
    }
    const report = await ViolationReport.create({
      reportedBy: reportedBy || null,
      plateNumber: plateNumber.trim().toUpperCase(),
      area: area || null,
      description,
      photoBase64: photoBase64 || null,
    });
    res.status(201).json(report);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/violations -> admin: list all, newest first
router.get('/', requireRole('admin'), async (req, res) => {
  try {
    const reports = await ViolationReport.find().populate('area').populate('reportedBy', 'surname givenName studentId').sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/violations/:id/status -> admin updates status
router.put('/:id/status', requireRole('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Pending', 'Under Review', 'Resolved', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const report = await ViolationReport.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!report) return res.status(404).json({ message: 'Report not found' });
    res.json(report);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
