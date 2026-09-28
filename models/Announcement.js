const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    area: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParkingArea',
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    requiredAction: {
      type: String,
      required: true,
      trim: true,
    },
    // Snapshot of plate numbers that were actively parked in the
    // affected area at the moment this announcement was created.
    affectedPlateNumbers: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Announcement', announcementSchema);
