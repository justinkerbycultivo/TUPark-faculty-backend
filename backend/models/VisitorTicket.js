const mongoose = require('mongoose');
const { VEHICLE_TYPE_KEYS } = require('../utils/vehicleTypes');

const visitorTicketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    visitorName: {
      type: String,
      required: true,
      trim: true,
    },
    contactNumber: {
      type: String,
      trim: true,
      default: '',
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
    // 'YYYY-MM-DD'
    dateIssued: {
      type: String,
      required: true,
    },
    entryTime: {
      type: Date,
      default: Date.now,
    },
    exitTime: {
      type: Date,
      default: null,
    },
    area: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParkingArea',
      required: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED', 'EXPIRED'],
      default: 'ACTIVE',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('VisitorTicket', visitorTicketSchema);
