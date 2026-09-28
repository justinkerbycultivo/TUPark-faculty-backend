const mongoose = require('mongoose');

// Every vehicle entry/exit — for students AND visitors — is one
// ParkingTransaction. There is no "reservation" status: a vehicle is
// either currently parked (ACTIVE) or its visit is over (COMPLETED).
const parkingTransactionSchema = new mongoose.Schema(
  {
    subjectType: {
      type: String,
      enum: ['student', 'visitor'],
      required: true,
    },
    // Set when subjectType === 'student'
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Set when subjectType === 'visitor'
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
      enum: ['car', 'motorcycle'],
      required: true,
    },
    // Motorcycle-equivalent slots this transaction occupies (1 or 2).
    slotEquivalent: {
      type: Number,
      required: true,
    },

    area: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParkingArea',
      required: true,
    },
    // The specific space(s) assigned: 1 for a motorcycle, 2 for a car.
    spaces: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ParkingSpace' }],
      default: [],
    },

    entryTime: {
      type: Date,
      required: true,
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

    // Week 10 - parking photo verification
    photoStatus: {
      type: String,
      enum: ['pending', 'submitted', 'incomplete'],
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

// A vehicle cannot have two ACTIVE transactions at once.
// Partial unique index: only enforced while status === 'ACTIVE'.
parkingTransactionSchema.index(
  { plateNumber: 1 },
  { unique: true, partialFilterExpression: { status: 'ACTIVE' } }
);

module.exports = mongoose.model('ParkingTransaction', parkingTransactionSchema);
