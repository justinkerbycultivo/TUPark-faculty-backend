const mongoose = require('mongoose');

// Faculty/admin pre-booking of a specific parking space.
// Students are never allowed to create these (enforced in routes/reservations.js).
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
    space: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParkingSpace',
      required: true,
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
