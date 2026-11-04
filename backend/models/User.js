const mongoose = require('mongoose');
const crypto = require('crypto');
const { VEHICLE_TYPE_KEYS } = require('../utils/vehicleTypes');

const userSchema = new mongoose.Schema(
  {
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

    role: {
      type: String,
      enum: ['student', 'faculty', 'guard', 'admin'],
      default: 'student',
    },

    // Guard accounts register as 'pending' and need admin approval. Existing
    // documents have no value here and are treated as 'approved', so current
    // users and guards keep working with no migration.
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

    qrToken: {
      type: String,
      unique: true,
      default: () => crypto.randomUUID(),
    },

    // Password reset: only a SHA-256 hash of the 6-digit code is stored,
    // never the code itself. Cleared after use or expiry. All optional, so
    // existing user documents keep working unchanged.
    resetCodeHash: { type: String, default: null, select: false },
    resetCodeExpires: { type: Date, default: null, select: false },
    resetCodeAttempts: { type: Number, default: 0, select: false },

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

// Returns "SURNAME, Given Name M." style formatted name.
userSchema.methods.formattedName = function formattedName() {
  const surname = (this.surname || '').toUpperCase();
  const given = this.givenName || '';
  const middleInitial = this.middleName ? `${this.middleName.trim().charAt(0).toUpperCase()}.` : '';
  return [`${surname},`, given, middleInitial].filter(Boolean).join(' ').trim();
};

module.exports = mongoose.model('User', userSchema);
