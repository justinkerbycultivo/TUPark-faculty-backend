const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    area: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParkingArea',
      required: true,
    },

    // First space; retained for compatibility with existing records.
    space: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParkingSpace',
      required: true,
    },

    // All spaces included in the reservation.
    // Old records without this field remain supported.
    spaces: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'ParkingSpace',
        },
      ],
      default: [],
    },

    status: {
      type: String,
      enum: ['ACTIVE', 'CANCELLED', 'FULFILLED'],
      default: 'ACTIVE',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Reservation', reservationSchema);