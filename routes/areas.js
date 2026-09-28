const express = require('express');
const router = express.Router();
const ParkingArea = require('../models/ParkingArea');
const ParkingSpace = require('../models/ParkingSpace');
const { withCapacity, generateSpacesForArea, growSpacesForArea } = require('../utils/capacity');
const { requireRole } = require('../middleware/auth');

// GET /api/areas -> all areas with live occupied/remaining capacity
router.get('/', async (req, res) => {
  try {
    const areas = await ParkingArea.find().sort({ name: 1 });
    const withCap = await Promise.all(areas.map(withCapacity));
    res.json(withCap);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/areas/:id
router.get('/:id', async (req, res) => {
  try {
    const area = await ParkingArea.findById(req.params.id);
    if (!area) return res.status(404).json({ message: 'Parking area not found' });
    res.json(await withCapacity(area));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/areas/:id/spaces -> the individual spaces, for the visual map
router.get('/:id/spaces', async (req, res) => {
  try {
    const area = await ParkingArea.findById(req.params.id);
    if (!area) return res.status(404).json({ message: 'Parking area not found' });
    const spaces = await ParkingSpace.find({ area: area._id }).sort({ index: 1 });
    res.json({ area, spaces });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/areas -> admin creates a new parking area (auto-generates
// its individual ParkingSpace records)
router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const { name, code, location, capacity } = req.body;
    if (!name || !code || !capacity) {
      return res.status(400).json({ message: 'Name, code, and capacity are required' });
    }
    const area = await ParkingArea.create({ name, code: code.toUpperCase(), location, capacity });
    await generateSpacesForArea(area);
    res.status(201).json(await withCapacity(area));
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'A parking area with this name or code already exists' });
    }
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/areas/:id -> admin edits name/location/capacity/isActive.
// If capacity is increased, new spaces are generated to match. Capacity
// cannot be decreased below the number of spaces already generated
// (that would silently delete real space records / mess with occupied ones).
router.put('/:id', requireRole('admin'), async (req, res) => {
  try {
    const existing = await ParkingArea.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Parking area not found' });

    const previousCapacity = existing.capacity;
    if (req.body.capacity !== undefined && Number(req.body.capacity) < previousCapacity) {
      return res.status(400).json({
        message: `Capacity cannot be reduced below the existing ${previousCapacity} generated spaces. Deactivate the area instead.`,
      });
    }

    const area = await ParkingArea.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    await growSpacesForArea(area, previousCapacity);

    res.json(await withCapacity(area));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/areas/:id
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const area = await ParkingArea.findByIdAndDelete(req.params.id);
    if (!area) return res.status(404).json({ message: 'Parking area not found' });
    await ParkingSpace.deleteMany({ area: area._id });
    res.json({ message: 'Parking area deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
