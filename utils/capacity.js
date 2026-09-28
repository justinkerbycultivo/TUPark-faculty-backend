const ParkingSpace = require('../models/ParkingSpace');

// Motorcycle = 1 slot, Car = 2 slots.
function slotsFor(vehicleType) {
  return vehicleType === 'car' ? 2 : 1;
}

// Creates `capacity` individual ParkingSpace docs for a freshly-created
// area, coded "<AREACODE>-1", "<AREACODE>-2", ...
async function generateSpacesForArea(area) {
  const docs = [];
  for (let i = 1; i <= area.capacity; i++) {
    docs.push({ area: area._id, code: `${area.code}-${i}`, index: i, status: 'available' });
  }
  return ParkingSpace.insertMany(docs);
}

// If capacity increased, top up with new spaces so existing areas (or
// areas edited to a larger capacity) stay consistent with their space count.
async function growSpacesForArea(area, previousCapacity) {
  if (area.capacity <= previousCapacity) return;
  const docs = [];
  for (let i = previousCapacity + 1; i <= area.capacity; i++) {
    docs.push({ area: area._id, code: `${area.code}-${i}`, index: i, status: 'available' });
  }
  if (docs.length) await ParkingSpace.insertMany(docs);
}

async function getOccupiedSlots(areaId) {
  return ParkingSpace.countDocuments({ area: areaId, status: { $in: ['occupied', 'reserved'] } });
}

// Attaches occupied/remaining to a plain ParkingArea object.
async function withCapacity(area) {
  const occupied = await getOccupiedSlots(area._id);
  return {
    ...(area.toObject ? area.toObject() : area),
    occupiedSlots: occupied,
    remainingSlots: Math.max(0, area.capacity - occupied),
  };
}

// Picks `count` free ("available") spaces in one active area, preferring
// the lowest-indexed and keeping cars' 2 spaces consecutive when possible.
// Returns [] if not enough free spaces exist in that area.
async function pickFreeSpacesInArea(areaId, count) {
  const free = await ParkingSpace.find({ area: areaId, status: 'available' }).sort({ index: 1 });
  if (free.length < count) return [];
  if (count === 1) return [free[0]];
  // Try to find two consecutive indices for a car; fall back to any two.
  for (let i = 0; i < free.length - 1; i++) {
    if (free[i + 1].index === free[i].index + 1) {
      return [free[i], free[i + 1]];
    }
  }
  return free.slice(0, count);
}

// Scans active areas (lowest name first) for the first one with enough
// free spaces, allocates them (marks 'occupied'), and returns
// { area, spaces }. Returns null if nothing fits anywhere.
async function allocateSpaces(ParkingArea, vehicleType) {
  const count = slotsFor(vehicleType);
  const areas = await ParkingArea.find({ isActive: true }).sort({ name: 1 });
  for (const area of areas) {
    const spaces = await pickFreeSpacesInArea(area._id, count);
    if (spaces.length === count) {
      return { area, spaces };
    }
  }
  return null;
}

async function markSpacesOccupied(spaceIds, transactionId) {
  await ParkingSpace.updateMany(
    { _id: { $in: spaceIds } },
    { status: 'occupied', currentTransaction: transactionId }
  );
}

async function releaseSpaces(spaceIds) {
  await ParkingSpace.updateMany(
    { _id: { $in: spaceIds } },
    { status: 'available', currentTransaction: null }
  );
}

module.exports = {
  slotsFor,
  generateSpacesForArea,
  growSpacesForArea,
  getOccupiedSlots,
  withCapacity,
  pickFreeSpacesInArea,
  allocateSpaces,
  markSpacesOccupied,
  releaseSpaces,
};
