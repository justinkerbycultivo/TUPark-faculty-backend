const ParkingSpace = require('../models/ParkingSpace');
const ParkingArea = require('../models/ParkingArea');

// ==========================================
// VEHICLE SLOT REQUIREMENTS
// ==========================================
// Motorcycle = 1 parking slot
// Car = 2 parking slots
function slotsFor(vehicleType) {
  return vehicleType === 'car' ? 2 : 1;
}

// ==========================================
// GENERATE PARKING SPACES
// ==========================================
// Creates individual parking spaces when a
// new parking area is created.
//
// Example:
// Area Code: GF
// Capacity: 20
//
// Creates:
// GF-1
// GF-2
// GF-3
// ...
// GF-20
//
// Every newly-created space starts as:
// status: "available"
async function generateSpacesForArea(area) {
  if (!area) {
    throw new Error('Parking area is required.');
  }

  const capacity = Number(area.capacity);

  if (!Number.isInteger(capacity) || capacity <= 0) {
    throw new Error('Parking area capacity must be greater than 0.');
  }

  const areaCode = String(area.code || '').trim().toUpperCase();

  if (!areaCode) {
    throw new Error('Parking area code is required.');
  }

  // Check whether spaces already exist.
  // This prevents accidentally creating duplicates.
  const existingCount = await ParkingSpace.countDocuments({
    area: area._id,
  });

  if (existingCount >= capacity) {
    return ParkingSpace.find({
      area: area._id,
    }).sort({ index: 1 });
  }

  const docs = [];

  for (let i = existingCount + 1; i <= capacity; i++) {
    docs.push({
      area: area._id,
      code: `${areaCode}-${i}`,
      index: i,
      status: 'available',
      currentTransaction: null,
    });
  }

  if (docs.length > 0) {
    await ParkingSpace.insertMany(docs);
  }

  return ParkingSpace.find({
    area: area._id,
  }).sort({ index: 1 });
}

// ==========================================
// GROW PARKING SPACES
// ==========================================
// Used when Admin increases an area's capacity.
//
// Example:
//
// Existing:
// GF-1 ... GF-20
//
// Admin changes capacity:
// 20 → 25
//
// This creates:
// GF-21
// GF-22
// GF-23
// GF-24
// GF-25
async function growSpacesForArea(area, previousCapacity) {
  if (!area) {
    throw new Error('Parking area is required.');
  }

  const newCapacity = Number(area.capacity);
  const oldCapacity = Number(previousCapacity);

  if (!Number.isInteger(newCapacity) || newCapacity <= oldCapacity) {
    return;
  }

  const areaCode = String(area.code || '').trim().toUpperCase();

  if (!areaCode) {
    throw new Error('Parking area code is required.');
  }

  // Get the highest existing index.
  const lastSpace = await ParkingSpace.findOne({
    area: area._id,
  }).sort({ index: -1 });

  const startingIndex = lastSpace
    ? Number(lastSpace.index) + 1
    : oldCapacity + 1;

  const docs = [];

  for (
    let i = startingIndex;
    i <= newCapacity;
    i++
  ) {
    docs.push({
      area: area._id,
      code: `${areaCode}-${i}`,
      index: i,
      status: 'available',
      currentTransaction: null,
    });
  }

  if (docs.length > 0) {
    await ParkingSpace.insertMany(docs);
  }

  return ParkingSpace.find({
    area: area._id,
  }).sort({ index: 1 });
}

// ==========================================
// COUNT OCCUPIED SLOTS
// ==========================================
// Counts spaces currently occupied or reserved.
async function getOccupiedSlots(areaId) {
  return ParkingSpace.countDocuments({
    area: areaId,
    status: {
      $in: ['occupied', 'reserved'],
    },
  });
}

// ==========================================
// AREA CAPACITY INFORMATION
// ==========================================
// Adds:
// occupiedSlots
// remainingSlots
//
// Example:
// capacity = 20
// occupied = 3
//
// remaining = 17
async function withCapacity(area) {
  if (!area) {
    return null;
  }

  const occupied = await getOccupiedSlots(area._id);

  return {
    ...(area.toObject ? area.toObject() : area),

    occupiedSlots: occupied,

    remainingSlots: Math.max(
      0,
      Number(area.capacity) - occupied
    ),
  };
}

// ==========================================
// FIND FREE PARKING SPACES
// ==========================================
// Finds available spaces in an area.
//
// Motorcycle:
// → needs 1 space
//
// Car:
// → needs 2 consecutive spaces
async function pickFreeSpacesInArea(areaId, count) {
  const requiredSpaces = Number(count);

  if (
    !Number.isInteger(requiredSpaces) ||
    requiredSpaces <= 0
  ) {
    return [];
  }

  const free = await ParkingSpace.find({
    area: areaId,
    status: 'available',
  }).sort({
    index: 1,
  });

  // Not enough available spaces.
  if (free.length < requiredSpaces) {
    return [];
  }

  // Motorcycle = one space.
  if (requiredSpaces === 1) {
    return [free[0]];
  }

  // ==========================================
  // FIND CONSECUTIVE SPACES
  // ==========================================
  for (
    let i = 0;
    i <= free.length - requiredSpaces;
    i++
  ) {
    let consecutive = true;

    for (
      let j = 1;
      j < requiredSpaces;
      j++
    ) {
      if (
        free[i + j].index !==
        free[i].index + j
      ) {
        consecutive = false;
        break;
      }
    }

    if (consecutive) {
      return free.slice(
        i,
        i + requiredSpaces
      );
    }
  }

  // If no consecutive spaces are available,
  // don't assign separated spaces to a car.
  return [];
}

// ==========================================
// ALLOCATE PARKING SPACES
// ==========================================
// Finds an active parking area that has enough
// available spaces.
//
// Car:
// → 2 consecutive spaces
//
// Motorcycle:
// → 1 space
//
// Returns:
// {
//   area,
//   spaces
// }
//
// Returns null if no suitable space exists.
async function allocateSpaces(
  ParkingAreaModel,
  vehicleType
) {
  const count = slotsFor(vehicleType);

  // Get active parking areas.
  const areas = await ParkingAreaModel.find({
    isActive: true,
  }).sort({
    name: 1,
  });

  for (const area of areas) {
    const spaces = await pickFreeSpacesInArea(
      area._id,
      count
    );

    if (spaces.length === count) {
      return {
        area,
        spaces,
      };
    }
  }

  return null;
}

// ==========================================
// MARK SPACES AS OCCUPIED
// ==========================================
async function markSpacesOccupied(
  spaceIds,
  transactionId
) {
  if (!Array.isArray(spaceIds) || spaceIds.length === 0) {
    return;
  }

  await ParkingSpace.updateMany(
    {
      _id: {
        $in: spaceIds,
      },

      // Safety check:
      // only available spaces can become occupied.
      status: 'available',
    },
    {
      $set: {
        status: 'occupied',
        currentTransaction: transactionId,
      },
    }
  );
}

// ==========================================
// RELEASE PARKING SPACES
// ==========================================
// Used when a vehicle checks out.
async function releaseSpaces(spaceIds) {
  if (!Array.isArray(spaceIds) || spaceIds.length === 0) {
    return;
  }

  await ParkingSpace.updateMany(
    {
      _id: {
        $in: spaceIds,
      },
    },
    {
      $set: {
        status: 'available',
        currentTransaction: null,
      },
    }
  );
}

// ==========================================
// EXPORT FUNCTIONS
// ==========================================
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