
const mongoose = require('mongoose');
const crypto = require('crypto');
const { VEHICLE_TYPE_KEYS } = require('../utils/vehicleTypes');

const userSchema = new mongoose.Schema(
  {
    // Legacy field retained for existing accounts.
    fullName: {
      type: String,
      trim: true,
    },

    surname: {
      type: String,
      required: true,
      trim: true,
    },

    givenName: {
      type: String,
      required: true,
      trim: true,
    },

    middleName: {
      type: String,
      trim: true,
      default: '',
    },

    studentId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    contactNumber: {
      type: String,
      required: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },

    // Increment this value to invalidate previously issued JWTs.
    tokenVersion: {
      type: Number,
      default: 0,
    },

    role: {
      type: String,
      enum: ['student', 'faculty', 'guard', 'admin'],
      default: 'student',
    },

    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved',
    },

    vehicle: {
      plateNumber: {
        type: String,
        trim: true,
        uppercase: true,
        unique: true,
        sparse: true,
      },

      vehicleType: {
        type: String,
        enum: VEHICLE_TYPE_KEYS,
      },

      vehicleTypeOther: {
        type: String,
        trim: true,
        default: '',
      },
    },

    avatar: {
      type: String,
      default: '',
    },

    qrToken: {
      type: String,
      unique: true,
      default: () => crypto.randomUUID(),
    },

    resetCodeHash: {
      type: String,
      default: null,
      select: false,
    },

    resetCodeExpires: {
      type: Date,
      default: null,
      select: false,
    },

    resetCodeAttempts: {
      type: Number,
      default: 0,
      select: false,
    },

    failedLoginAttempts: {
      type: Number,
      default: 0,
    },

    lockUntil: {
      type: Date,
      default: null,
    },

    agreedToTerms: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Returns the formatted split name for current accounts.
// Falls back to the original fullName for legacy accounts.
userSchema.methods.formattedName = function formattedName() {
  const surname = (this.surname || '').trim();
  const given = (this.givenName || '').trim();
  const middle = (this.middleName || '').trim();

  if (!surname && !given) {
    return (this.fullName || '').trim();
  }

  const middleInitial = middle
    ? `${middle.charAt(0).toUpperCase()}.`
    : '';

  return [
    surname ? `${surname.toUpperCase()},` : '',
    given,
    middleInitial,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();
};

module.exports = mongoose.model('User', userSchema);
