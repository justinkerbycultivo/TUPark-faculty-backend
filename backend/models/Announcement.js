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
      trim: true,
      default: '',
    },
    // Snapshot of plate numbers with an active transaction in this area
    // at the moment the announcement was created.
    affectedPlateNumbers: [
      {
        type: String,
        trim: true,
        uppercase: true,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Announcement', announcementSchema);
