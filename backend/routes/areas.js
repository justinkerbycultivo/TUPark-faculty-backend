const express = require('express');
const router = express.Router();

const ParkingArea = require('../models/ParkingArea');
const ParkingSpace = require('../models/ParkingSpace');
const { requireRole } = require('../middleware/auth');
const { withCapacity, generateSpacesForArea, growSpacesForArea } = require('../utils/capacity');

// GET /api/areas — public; needed for visitor navigation without login.
router.get('/', async (req, res) => {
  try {
    const areas = await ParkingArea.find().sort({ name: 1 });
    const withLiveCapacity = await Promise.all(areas.map((area) => withCapacity(area)));
    res.json(withLiveCapacity);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/areas/:id
router.get('/:id', async (req, res) => {
  try {
    const area = await ParkingArea.findById(req.params.id);
    if (!area) return res.status(404).json({ message: 'Parking area not found.' });
    res.json(await withCapacity(area));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/areas/:id/spaces — for the visual map.
router.get('/:id/spaces', async (req, res) => {
  try {
    const area = await ParkingArea.findById(req.params.id);
    if (!area) return res.status(404).json({ message: 'Parking area not found.' });
    const spaces = await ParkingSpace.find({ area: area._id }).sort({ index: 1 });
    res.json(spaces);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/areas — admin only.
router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const { name, code, location, capacity } = req.body;
    if (!name || !code || capacity === undefined) {
      return res.status(400).json({ message: 'name, code and capacity are required.' });
    }

    const area = await ParkingArea.create({ name, code, location, capacity });
    await generateSpacesForArea(area);

    res.status(201).json(await withCapacity(area));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/areas/:id — admin only.
router.put('/:id', requireRole('admin'), async (req, res) => {
  try {
    const area = await ParkingArea.findById(req.params.id);
    if (!area) return res.status(404).json({ message: 'Parking area not found.' });

    const { name, location, capacity, isActive } = req.body;

    if (capacity !== undefined) {
      const existingSpaceCount = await ParkingSpace.countDocuments({ area: area._id });
      if (capacity < existingSpaceCount) {
        return res.status(400).json({
          message: `Capacity cannot be reduced below the ${existingSpaceCount} spaces already generated for this area.`,
        });
      }
      if (capacity > area.capacity) {
        area.capacity = capacity;
        await area.save();
        await growSpacesForArea(area, capacity);
      } else {
        area.capacity = capacity;
      }
    }

    if (name !== undefined) area.name = name;
    if (location !== undefined) area.location = location;
    if (isActive !== undefined) area.isActive = isActive;

    await area.save();
    res.json(await withCapacity(area));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/areas/:id — admin only, cascades its ParkingSpace docs.
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const area = await ParkingArea.findById(req.params.id);
    if (!area) return res.status(404).json({ message: 'Parking area not found.' });

    await ParkingSpace.deleteMany({ area: area._id });
    await area.deleteOne();

    res.json({ message: 'Parking area and its spaces were deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
