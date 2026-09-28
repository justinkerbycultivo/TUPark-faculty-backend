const mongoose = require('mongoose');

// One individual, visually-mappable parking space inside a ParkingArea.
// Each space = 1 motorcycle-equivalent slot. A motorcycle transaction
// occupies 1 space; a car transaction occupies 2 spaces (kept consecutive
// where possible so the visual map reads naturally).
const parkingSpaceSchema = new mongoose.Schema(
  {
    area: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParkingArea',
      required: true,
    },
    // Display code, e.g. "A-1", "B-12".
    code: {
      type: String,
      required: true,
    },
    // Position within the area, used for ordering and for picking
    // consecutive spaces for a car.
    index: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['available', 'occupied', 'reserved'],
      default: 'available',
    },
    currentTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParkingTransaction',
      default: null,
    },
  },
  { timestamps: true }
);

parkingSpaceSchema.index({ area: 1, index: 1 }, { unique: true });

module.exports = mongoose.model('ParkingSpace', parkingSpaceSchema);
