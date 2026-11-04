const mongoose = require('mongoose');
const { VEHICLE_TYPE_KEYS } = require('../utils/vehicleTypes');

const parkingTransactionSchema = new mongoose.Schema(
  {
    subjectType: {
      type: String,
      enum: ['student', 'visitor'],
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    visitorTicket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VisitorTicket',
      default: null,
    },
    plateNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    vehicleType: {
      type: String,
      enum: VEHICLE_TYPE_KEYS,
      required: true,
    },
    vehicleTypeOther: {
      type: String,
      trim: true,
      default: '',
    },
    slotEquivalent: {
      type: Number,
      required: true,
    },
    area: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParkingArea',
      required: true,
    },
    spaces: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ParkingSpace',
      },
    ],
    entryTime: {
      type: Date,
      default: Date.now,
    },
    exitTime: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED'],
      default: 'ACTIVE',
    },
    photoStatus: {
      type: String,
      enum: ['pending', 'submitted'],
      default: 'pending',
    },
    photoBase64: {
      type: String,
      default: null,
    },
    photoSubmittedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Prevent two simultaneous ACTIVE transactions for the same plate.
parkingTransactionSchema.index(
  { plateNumber: 1 },
  { unique: true, partialFilterExpression: { status: 'ACTIVE' } }
);

module.exports = mongoose.model('ParkingTransaction', parkingTransactionSchema);
