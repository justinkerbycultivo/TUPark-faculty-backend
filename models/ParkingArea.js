const mongoose = require('mongoose');

// A physical parking area/lot with a total capacity expressed in
// motorcycle-equivalent slots. Occupied/remaining capacity is NOT stored
// here — it's computed live from active ParkingTransactions so it can
// never drift out of sync with reality.
const parkingAreaSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    // Short code used as the prefix for this area's individual space
    // codes (e.g. code "A" -> spaces A-1, A-2, A-3...).
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },
    // Total capacity in motorcycle-equivalent slots.
    // Rule: 1 motorcycle = 1 slot, 1 car = 2 slots.
    // Also equals the number of individual ParkingSpace records generated
    // for this area.
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ParkingArea', parkingAreaSchema);
