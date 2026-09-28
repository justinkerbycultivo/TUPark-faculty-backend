const mongoose = require('mongoose');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    // Week 4 - separate name fields instead of one free-text "Full Name"
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

    // The student's official school email is the unique university-account
    // identifier (one account per school email). Real Google/GSFE OAuth is
    // NOT implemented here — see routes/auth.js for where it would plug in.
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

    vehicle: {
      plateNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true,
      },
      vehicleType: {
        type: String,
        enum: ['car', 'motorcycle'],
        required: true,
      },
    },

    role: {
      type: String,
      enum: ['student', 'faculty', 'guard', 'admin'],
      default: 'student',
    },

    qrToken: {
      type: String,
      unique: true,
      default: () => crypto.randomUUID(),
    },

    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Display format: "SURNAME, Given Name Middle Name"
userSchema.methods.formattedName = function () {
  const middle = this.middleName ? ` ${this.middleName}` : '';
  return `${this.surname.toUpperCase()}, ${this.givenName}${middle}`;
};

module.exports = mongoose.model('User', userSchema);
