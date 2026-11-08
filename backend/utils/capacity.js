const ParkingArea = require('../models/ParkingArea');
const ParkingSpace = require('../models/ParkingSpace');
const { getVehicleTypeConfig } = require('./vehicleTypes');

// Motorcycle-equivalent slots required for a given vehicle type.
function slotsFor(vehicleType) {
  const config = getVehicleTypeConfig(vehicleType);
  return config ? config.slotsFor : 2; // safe default
}

// Returns true if `vehicleType` is allowed to park in `area` based on the
// vehicle type's eligibleAreaTypes config. If the area has no explicit type
// restriction (we only tag by code prefix) or the vehicle type is 'any',
// every area is eligible. This keeps the system usable even when areas
// aren't fully tagged with strict type restrictions.
function isAreaEligible(area, vehicleType) {
  const config = getVehicleTypeConfig(vehicleType);
  if (!config) return true; // unknown type, don't block
  const eligible = config.eligibleAreaTypes;
  if (!eligible || eligible === 'any') return true;
  if (!Array.isArray(eligible) || eligible.length === 0) return true;
  if (!area.code) return true;
  return eligible.some((prefix) => area.code.toUpperCase().startsWith(prefix.toUpperCase()));
}

async function generateSpacesForArea(area) {
  const docs = [];
  for (let i = 1; i <= area.capacity; i += 1) {
    docs.push({
      area: area._id,
      code: `${area.code}-${i}`,
      index: i,
      status: 'available',
    });
  }
  if (docs.length === 0) return [];
  return ParkingSpace.insertMany(docs, { ordered: false });
}

// Tops up a growing area with new spaces without removing/renumbering
// existing ones.
async function growSpacesForArea(area, newCapacity) {
  const existingCount = await ParkingSpace.countDocuments({ area: area._id });
  if (newCapacity <= existingCount) return [];

  const existingIndexes = new Set(
    (await ParkingSpace.find({ area: area._id }).select('index').lean()).map((s) => s.index)
  );

  const docs = [];
  for (let i = 1; i <= newCapacity; i += 1) {
    if (!existingIndexes.has(i)) {
      docs.push({
        area: area._id,
        code: `${area.code}-${i}`,
        index: i,
        status: 'available',
      });
    }
  }
  if (docs.length === 0) return [];
  return ParkingSpace.insertMany(docs, { ordered: false });
}

async function getOccupiedSlots(areaId) {
  return ParkingSpace.countDocuments({ area: areaId, status: { $in: ['occupied', 'reserved'] } });
}

async function withCapacity(area) {
  const occupied = await getOccupiedSlots(area._id);
  const plain = area.toObject ? area.toObject() : area;
  return {
    ...plain,
    occupied,
    remaining: Math.max(area.capacity - occupied, 0),
  };
}

// Returns a list of available spaces in the given area, sorted so that
// consecutive runs of indices are preferred. Does NOT claim them.
async function pickFreeSpacesInArea(areaId, slotsNeeded) {
  const freeSpaces = await ParkingSpace.find({ area: areaId, status: 'available' })
    .sort({ index: 1 })
    .lean();

  if (freeSpaces.length < slotsNeeded) return [];

  // Look for the first run of `slotsNeeded` consecutive indices.
  for (let i = 0; i <= freeSpaces.length - slotsNeeded; i += 1) {
    let consecutive = true;
    for (let j = 1; j < slotsNeeded; j += 1) {
      if (freeSpaces[i + j].index !== freeSpaces[i + j - 1].index + 1) {
        consecutive = false;
        break;
      }
    }
    if (consecutive) {
      return freeSpaces.slice(i, i + slotsNeeded);
    }
  }

  // No consecutive run found — fall back to any free spaces.
  return freeSpaces.slice(0, slotsNeeded);
}

// Atomically claims a single space, flipping it from 'available' to
// 'occupied' only if it is still 'available' at the time of the update.
// This makes allocation safe under concurrent requests: two simultaneous
// scans cannot both be assigned the same space, because the DB-level
// findOneAndUpdate filter re-checks status at write time, not at the
// earlier read time.
async function claimSpaceAtomically(spaceId) {
  return ParkingSpace.findOneAndUpdate(
    { _id: spaceId, status: 'available' },
    { $set: { status: 'occupied' } },
    { new: true }
  );
}

async function releaseSpacesRaw(spaceIds) {
  if (!spaceIds || spaceIds.length === 0) return;
  await ParkingSpace.updateMany(
    { _id: { $in: spaceIds } },
    { $set: { status: 'available', currentTransaction: null } }
  );
}

// Scans active ParkingAreas (ordered by name) for the first area that can
// fit `slotsFor(vehicleType)` slots for the given vehicle type, atomically
// claiming the spaces as it goes so concurrent requests can't double-book
// the same space. Returns { area, spaces } or null if no capacity anywhere.
async function allocateSpaces(vehicleType) {
  const slotsNeeded = slotsFor(vehicleType);
  const areas = await ParkingArea.find({ isActive: true }).sort({ name: 1 });

  for (const area of areas) {
    if (!isAreaEligible(area, vehicleType)) continue;

    // Try a few times in case of lost races against concurrent claims.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const candidates = await pickFreeSpacesInArea(area._id, slotsNeeded);
      if (candidates.length < slotsNeeded) break; // not enough room in this area

      const claimed = [];
      let failed = false;
      for (const candidate of candidates) {
        // eslint-disable-next-line no-await-in-loop
        const claimedSpace = await claimSpaceAtomically(candidate._id);
        if (!claimedSpace) {
          failed = true;
          break;
        }
        claimed.push(claimedSpace);
      }

      if (!failed && claimed.length === slotsNeeded) {
        return { area, spaces: claimed };
      }

      // Lost the race on at least one space — release what we did claim
      // and retry (another attempt will re-query fresh availability).
      // eslint-disable-next-line no-await-in-loop
      await releaseSpacesRaw(claimed.map((s) => s._id));
    }
  }

  return null;
}

async function markSpacesOccupied(spaceIds, transactionId) {
  await ParkingSpace.updateMany(
    { _id: { $in: spaceIds } },
    { $set: { status: 'occupied', currentTransaction: transactionId } }
  );
}

async function releaseSpaces(spaceIds) {
  await releaseSpacesRaw(spaceIds);
}

module.exports = {
  slotsFor,
  isAreaEligible,
  generateSpacesForArea,
  growSpacesForArea,
  getOccupiedSlots,
  withCapacity,
  pickFreeSpacesInArea,
  allocateSpaces,
  markSpacesOccupied,
  releaseSpaces,
};
