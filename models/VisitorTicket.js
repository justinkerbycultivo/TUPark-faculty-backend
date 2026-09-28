const mongoose = require('mongoose');

// A visitor never gets a permanent account. Each visit gets a ticket
// that's only valid for the calendar day it was issued (dateIssued,
// "YYYY-MM-DD"). Old tickets are kept as history — never deleted —
// they're just marked EXPIRED once their day has passed.
const visitorTicketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
    },
    visitorName: {
      type: String,
      required: true,
      trim: true,
    },
    contactNumber: {
      type: String,
      required: true,
      trim: true,
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
    // The calendar day (in the server's local date) this ticket is valid for.
    dateIssued: {
      type: String, // 'YYYY-MM-DD'
      required: true,
    },
    entryTime: {
      type: Date,
      default: null,
    },
    exitTime: {
      type: Date,
      default: null,
    },
    area: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ParkingArea',
      default: null,
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
