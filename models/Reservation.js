const mongoose = require('mongoose');

// Reservations exist ONLY for faculty and admin (enforced in
// routes/reservations.js via requireRole, never trusting the client).
// Reserving a space sets that ParkingSpace's status to 'reserved' so it's
// excluded from the normal student auto-assignment pool. When the
// reserving user is scanned in by a guard, the reservation is fulfilled
// and converted into a normal ParkingTransaction on that same space.
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
