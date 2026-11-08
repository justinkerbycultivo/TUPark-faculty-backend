
const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const ViolationReport = require('../models/ViolationReport');
const { requireRole } = require('../middleware/auth');

// POST /api/violations
// Only authenticated campus accounts may submit violation reports.
// Reporter identity always comes from the verified JWT.
router.post(
  '/',
  requireRole('student', 'faculty', 'guard', 'admin'),
  async (req, res) => {
    try {
      const {
        plateNumber,
        area,
        description,
        photoBase64,
      } = req.body;

      if (
        typeof plateNumber !== 'string' ||
        !plateNumber.trim()
      ) {
        return res.status(400).json({
          message: 'A plate number is required.',
        });
      }

      if (
        typeof description !== 'string' ||
        !description.trim()
      ) {
        return res.status(400).json({
          message: 'A violation description is required.',
        });
      }

      if (area && !mongoose.Types.ObjectId.isValid(area)) {
        return res.status(400).json({
          message: 'Invalid parking area.',
        });
      }

      if (
        photoBase64 !== undefined &&
        photoBase64 !== null &&
        typeof photoBase64 !== 'string'
      ) {
        return res.status(400).json({
          message: 'Invalid photo attachment.',
        });
      }

      const report = await ViolationReport.create({
        reportedBy: req.currentUser._id,
        plateNumber: plateNumber.trim().toUpperCase(),
        area: area || null,
        description: description.trim(),
        photoBase64: photoBase64 || null,
      });

      return res.status(201).json(report);
    } catch (err) {
      console.error('Submit violation report error:', err);

      return res.status(500).json({
        message: 'Unable to submit the violation report.',
      });
    }
  }
);

// GET /api/violations
// Admin only: retrieve all violation reports.
router.get('/', requireRole('admin'), async (req, res) => {
  try {
    const reports = await ViolationReport.find()
      .populate(['reportedBy', 'area'])
      .sort({ createdAt: -1 });

    return res.json(reports);
  } catch (err) {
    console.error('Get violation reports error:', err);

    return res.status(500).json({
      message: 'Unable to retrieve violation reports.',
    });
  }
});

// PUT /api/violations/:id/status
// Admin only: update violation report status.
router.put(
  '/:id/status',
  requireRole('admin'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          message: 'Invalid violation report ID.',
        });
      }

      const allowedStatuses = [
        'Pending',
        'Under Review',
        'Resolved',
        'Rejected',
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          message: `Status must be one of: ${allowedStatuses.join(', ')}.`,
        });
      }

      const report = await ViolationReport.findById(id);

      if (!report) {
        return res.status(404).json({
          message: 'Violation report not found.',
        });
      }

      report.status = status;

      await report.save();

      return res.json(report);
    } catch (err) {
      console.error('Update violation status error:', err);

      return res.status(500).json({
        message: 'Unable to update violation report status.',
      });
    }
  }
);

module.exports = router;
