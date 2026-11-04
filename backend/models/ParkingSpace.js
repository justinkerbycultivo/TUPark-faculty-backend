const mongoose = require('mongoose');

const parkingSpaceSchema = new mongoose.Schema(
  {
    area: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParkingArea',
      required: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
    },
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
