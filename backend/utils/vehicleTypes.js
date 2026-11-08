// Vehicle type configuration table.
//
// `slotsFor` is expressed in "motorcycle-equivalent" slots, matching
// ParkingArea.capacity / ParkingSpace counts (a ParkingArea's capacity is
// defined in motorcycle-equivalent slots).
//
// `eligibleAreaTypes` is either the string 'any' (the vehicle type may park
// in any ParkingArea regardless of the area's code prefix), or an array of
// ParkingArea.code prefixes the vehicle type is restricted to. Most types
// default to 'any' to keep the system usable even when areas aren't tagged
// with strict type restrictions.
//
// TODO (future enhancement, intentionally not implemented here to keep this
// simple): bicycles conceptually should prefer dedicated bike-rack areas
// over full vehicle slots. For now bicycles just consume 1 motorcycle-
// equivalent slot like any other small vehicle.

const VEHICLE_TYPES = {
  motorcycle: {
    key: 'motorcycle',
    label: 'Motorcycle',
    slotsFor: 1,
    eligibleAreaTypes: 'any',
  },
  car: {
    key: 'car',
    label: 'Car',
    slotsFor: 2,
    eligibleAreaTypes: 'any',
  },
  tricycle: {
    key: 'tricycle',
    label: 'Tricycle',
    // Treated like a small car for slot purposes.
    slotsFor: 2,
    eligibleAreaTypes: 'any',
  },
  e_bike: {
    key: 'e_bike',
    label: 'E-Bike',
    slotsFor: 1,
    eligibleAreaTypes: 'any',
  },
  bicycle: {
    key: 'bicycle',
    label: 'Bicycle',
    slotsFor: 1,
    eligibleAreaTypes: 'any',
  },
  electric_motorcycle: {
    key: 'electric_motorcycle',
    label: 'Electric Motorcycle',
    slotsFor: 1,
    eligibleAreaTypes: 'any',
  },
  electric_scooter: {
    key: 'electric_scooter',
    label: 'Electric Scooter',
    slotsFor: 1,
    eligibleAreaTypes: 'any',
  },
  other: {
    key: 'other',
    label: 'Other',
    // Safe default: treat unknown vehicles as car-sized.
    slotsFor: 2,
    eligibleAreaTypes: 'any',
  },
};

const VEHICLE_TYPE_KEYS = Object.keys(VEHICLE_TYPES);

function isValidVehicleType(type) {
  return VEHICLE_TYPE_KEYS.includes(type);
}

function getVehicleTypeConfig(type) {
  return VEHICLE_TYPES[type] || null;
}

module.exports = {
  VEHICLE_TYPES,
  VEHICLE_TYPE_KEYS,
  isValidVehicleType,
  getVehicleTypeConfig,
};
