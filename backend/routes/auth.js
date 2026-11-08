
const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const router = express.Router();
const User = require('../models/User');
const ParkingTransaction = require('../models/ParkingTransaction');
const { generateCaptcha, verifyCaptcha } = require('../utils/captcha');
const { VEHICLE_TYPE_KEYS } = require('../utils/vehicleTypes');
const { sendMail, smtpConfigured } = require('../utils/mailer');
const { rateLimit } = require('../utils/rateLimit');
const { requireRole } = require('../middleware/auth');

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const STUDENT_ID_RE = /^\d{4}-\d{4,6}$/;
const CONTACT_RE = /^09\d{9}$/;
const PLATE_RE = /^[A-Za-z0-9-]{3,10}$/;
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const NAME_RE = /^[A-Za-z\u00C0-\u00FF.'\- ]{1,60}$/;

const LOCKOUT_THRESHOLD = 3;
const LOCKOUT_MS = 60 * 1000;

const RESET_CODE_TTL_MS = 15 * 60 * 1000;
const RESET_MAX_ATTEMPTS = 5;

const GENERIC_FORGOT_MESSAGE =
  'If that email is registered, a 6-digit reset code has been sent. It expires in 15 minutes.';

const hashCode = (code) =>
  crypto.createHash('sha256').update(String(code)).digest('hex');

const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many reset requests. Please wait 15 minutes and try again.',
});

const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many attempts. Please wait 15 minutes and try again.',
});

function resolveNameParts(body) {
  if (!body.surname || !body.givenName) return null;

  return {
    surname: String(body.surname).trim(),
    givenName: String(body.givenName).trim(),
    middleName: body.middleName ? String(body.middleName).trim() : '',
  };
}

function isValidName(value) {
  return typeof value === 'string' && NAME_RE.test(value.trim());
}

function isValidPassword(value) {
  return PASSWORD_RE.test(String(value || ''));
}

function resetCodeMatches(inputCode, storedHash) {
  const given = Buffer.from(hashCode(inputCode), 'hex');
  const stored = Buffer.from(storedHash || '', 'hex');

  return (
    given.length === stored.length &&
    given.length > 0 &&
    crypto.timingSafeEqual(given, stored)
  );
}

function createAuthToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured.');
  }

  return jwt.sign(
    {
      tokenVersion: Number(user.tokenVersion || 0),
    },
    process.env.JWT_SECRET,
    {
      algorithm: 'HS256',
      subject: String(user._id),
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
}

function buildUserResponse(user) {
  return {
    id: String(user._id),
    formattedName: user.formattedName(),
    surname: user.surname || '',
    givenName: user.givenName || '',
    middleName: user.middleName || '',
    studentId: user.studentId,
    email: user.email,
    contactNumber: user.contactNumber,
    role: user.role,
    vehicle: user.vehicle,
    avatar: user.avatar || '',
    qrToken: user.qrToken,
  };
}

// GET /api/auth/captcha
router.get('/captcha', (req, res) => {
  const { captchaId, question } = generateCaptcha();
  res.json({ captchaId, question });
});

// ---------------------------------------------------------------------------
// REGISTER
// ---------------------------------------------------------------------------

router.post('/register', async (req, res) => {
  try {
    const {
      studentId,
      email,
      contactNumber,
      password,
      plateNumber,
      vehicleType,
      vehicleTypeOther,
      agreedToTerms,
      captchaId,
      captchaAnswer,
      accountType = 'student',
    } = req.body;

    const nameParts = resolveNameParts(req.body);

    if (!['student', 'guard'].includes(accountType)) {
      return res.status(400).json({
        message: 'Invalid account type. Choose Student or Guard.',
      });
    }

    if (!nameParts || !studentId || !email || !contactNumber || !password) {
      return res.status(400).json({
        message: 'Please fill in all required fields.',
      });
    }

    if (agreedToTerms !== true) {
      return res.status(400).json({
        message: 'You must agree to the terms and conditions to register.',
      });
    }

    if (!verifyCaptcha(captchaId, captchaAnswer)) {
      return res.status(400).json({
        message: 'CAPTCHA verification failed. Please try again.',
      });
    }

    if (!isValidName(nameParts.surname) || !isValidName(nameParts.givenName)) {
      return res.status(400).json({
        message: 'Please provide a valid surname and given name.',
      });
    }

    if (!EMAIL_RE.test(String(email))) {
      return res.status(400).json({
        message: 'Please provide a valid email address.',
      });
    }

    if (!CONTACT_RE.test(String(contactNumber))) {
      return res.status(400).json({
        message: 'Contact number must be an 11-digit number starting with 09.',
      });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters and include letters and numbers.',
      });
    }

    if (accountType === 'guard') {
      const GUARD_ID_RE = /^[A-Za-z0-9-]{3,20}$/;

      if (!GUARD_ID_RE.test(String(studentId))) {
        return res.status(400).json({
          message: 'Guard ID must be 3-20 letters, numbers or dashes.',
        });
      }
    } else {
      if (!STUDENT_ID_RE.test(String(studentId))) {
        return res.status(400).json({
          message: 'Student ID must be in the format 0000-0000.',
        });
      }

      if (!plateNumber || !vehicleType) {
        return res.status(400).json({
          message: 'Please fill in all required fields.',
        });
      }

      if (!PLATE_RE.test(String(plateNumber))) {
        return res.status(400).json({
          message: 'Please provide a valid plate number.',
        });
      }

      if (!VEHICLE_TYPE_KEYS.includes(vehicleType)) {
        return res.status(400).json({
          message: 'Please select a valid vehicle type.',
        });
      }

      if (vehicleType === 'other' && !String(vehicleTypeOther || '').trim()) {
        return res.status(400).json({
          message: 'Please specify your vehicle type.',
        });
      }
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const existingEmail = await User.findOne({ email: normalizedEmail });

    if (existingEmail) {
      return res.status(400).json({
        message: 'This university account is already registered.',
      });
    }

    const existingId = await User.findOne({ studentId });

    if (existingId) {
      return res.status(400).json({
        message: accountType === 'guard'
          ? 'This ID is already registered.'
          : 'This Student ID is already registered.',
      });
    }

    const userData = {
      surname: nameParts.surname,
      givenName: nameParts.givenName,
      middleName: nameParts.middleName,
      studentId,
      email: normalizedEmail,
      contactNumber,
      passwordHash: await bcrypt.hash(password, 10),
      role: accountType === 'guard' ? 'guard' : 'student',
      agreedToTerms: true,
    };

    if (accountType === 'guard') {
      userData.approvalStatus = 'pending';

      const guard = await User.create(userData);

      return res.status(201).json({
        message: 'Guard registration submitted. Your account is pending admin approval. You can log in once it is approved.',
        pendingApproval: true,
        user: {
          id: guard._id,
          formattedName: guard.formattedName(),
          email: guard.email,
          role: guard.role,
        },
      });
    }

    const normalizedPlate = String(plateNumber).trim().toUpperCase();

    const existingPlate = await User.findOne({
      'vehicle.plateNumber': normalizedPlate,
    });

    if (existingPlate) {
      return res.status(400).json({
        message: 'This plate number is already registered.',
      });
    }

    userData.vehicle = {
      plateNumber: normalizedPlate,
      vehicleType,
      vehicleTypeOther: vehicleType === 'other'
        ? String(vehicleTypeOther).trim()
        : '',
    };

    const user = await User.create(userData);

    return res.status(201).json({
      message: 'Account created successfully.',
      user: {
        id: user._id,
        formattedName: user.formattedName(),
        studentId: user.studentId,
        email: user.email,
        role: user.role,
        qrToken: user.qrToken,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: 'An account with one of these details is already registered.',
      });
    }

    return res.status(500).json({
      message: 'Server error during registration.',
    });
  }
});

// ---------------------------------------------------------------------------
// LOGIN
// ---------------------------------------------------------------------------

router.post('/login', async (req, res) => {
  try {
    const { identifier, email, studentId, password } = req.body;
    const lookupValue = identifier || email || studentId;

    if (!lookupValue || !password) {
      return res.status(400).json({
        message: 'Please enter your email/Student ID and password.',
      });
    }

    const user = await User.findOne({
      $or: [
        { email: String(lookupValue).trim().toLowerCase() },
        { studentId: String(lookupValue).trim() },
      ],
    });

    if (!user) {
      return res.status(404).json({
        message: 'Account not found.',
      });
    }

    const now = new Date();

    if (user.lockUntil && user.lockUntil > now) {
      const lockedForSeconds = Math.ceil(
        (user.lockUntil.getTime() - now.getTime()) / 1000
      );

      return res.status(423).json({
        message: `Account temporarily locked. Try again in ${lockedForSeconds} seconds.`,
        lockedForSeconds,
      });
    }

    const passwordMatch = await bcrypt.compare(
      String(password),
      user.passwordHash
    );

    if (!passwordMatch) {
      await User.updateOne(
        { _id: user._id },
        { $inc: { failedLoginAttempts: 1 } }
      );

      const updatedUser = await User.findById(user._id).select(
        'failedLoginAttempts'
      );

      const attempts = updatedUser
        ? updatedUser.failedLoginAttempts || 0
        : 0;

      if (attempts >= LOCKOUT_THRESHOLD) {
        const lockUntil = new Date(Date.now() + LOCKOUT_MS);

        await User.updateOne(
          {
            _id: user._id,
            failedLoginAttempts: { $gte: LOCKOUT_THRESHOLD },
          },
          {
            $set: {
              lockUntil,
              failedLoginAttempts: 0,
            },
          }
        );

        return res.status(423).json({
          message: 'Account temporarily locked. Try again in 60 seconds.',
          lockedForSeconds: 60,
        });
      }

      return res.status(401).json({
        message: `Incorrect password. ${LOCKOUT_THRESHOLD - attempts} attempt(s) left before lockout.`,
      });
    }

    if (user.approvalStatus === 'pending') {
      return res.status(403).json({
        message: 'Your Guard account is still awaiting admin approval. Please try again after it is approved.',
        approvalStatus: 'pending',
      });
    }

    if (user.approvalStatus === 'rejected') {
      return res.status(403).json({
        message: 'Your Guard registration was not approved. Please contact the administrator.',
        approvalStatus: 'rejected',
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured.');

      return res.status(500).json({
        message: 'Authentication service is not configured.',
      });
    }

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          failedLoginAttempts: 0,
          lockUntil: null,
        },
      }
    );

    // tokenVersion defaults to 0 for existing legacy accounts.
    const token = createAuthToken(user);

    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.error('Login error:', error);

    return res.status(500).json({
      message: 'Server error during login.',
    });
  }
});

// ---------------------------------------------------------------------------
// VERIFY / RESTORE SESSION
// GET /api/auth/me
// ---------------------------------------------------------------------------

router.get(
  '/me',
  requireRole('student', 'faculty', 'guard', 'admin'),
  (req, res) => {
    return res.json({
      user: buildUserResponse(req.currentUser),
    });
  }
);

// ---------------------------------------------------------------------------
// FORGOT PASSWORD
// ---------------------------------------------------------------------------

router.post('/forgot-password', forgotLimiter, async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();

    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({
        message: 'Enter a valid email address.',
      });
    }

    const user = await User.findOne({ email });

    if (user) {
      const code = String(
        crypto.randomInt(0, 1000000)
      ).padStart(6, '0');

      const codeHash = hashCode(code);
      const expires = new Date(Date.now() + RESET_CODE_TTL_MS);

      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            resetCodeHash: codeHash,
            resetCodeExpires: expires,
            resetCodeAttempts: 0,
          },
        }
      );

      const result = await sendMail({
        to: user.email,
        subject: 'TUPark password reset code',
        text:
          `Your TUPark password reset code is ${code}.\n` +
          'It expires in 15 minutes and can be used once. ' +
          'If you did not request this, you can ignore this email.',
      });

      if (!result.sent) {
        console.warn(`Password reset email not sent (${result.reason}).`);

        if (
          process.env.RESET_DEV_LOG === 'true' &&
          process.env.NODE_ENV !== 'production'
        ) {
          console.log(`[DEV ONLY] Reset code for ${user.email}: ${code}`);
        }
      }
    }

    return res.json({
      message: GENERIC_FORGOT_MESSAGE,
      emailConfigured: smtpConfigured(),
    });
  } catch (error) {
    console.error('Forgot password error:', error);

    return res.status(500).json({
      message: 'Server error. Please try again.',
    });
  }
});

// ---------------------------------------------------------------------------
// RESET PASSWORD
// ---------------------------------------------------------------------------

router.post('/reset-password', resetLimiter, async (req, res) => {
  const invalid = {
    message: 'That code is invalid or has expired. Request a new one.',
  };

  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const code = String(req.body.code || '').trim();
    const newPassword = String(req.body.newPassword || '');

    if (!EMAIL_RE.test(email) || !/^\d{6}$/.test(code)) {
      return res.status(400).json({
        message: 'Enter your email and the 6-digit code.',
      });
    }

    if (!isValidPassword(newPassword)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters and include a letter and a number.',
      });
    }

    const user = await User.findOne({ email }).select(
      '+resetCodeHash +resetCodeExpires +resetCodeAttempts'
    );

    const now = new Date();

    if (
      !user ||
      !user.resetCodeHash ||
      !user.resetCodeExpires ||
      user.resetCodeExpires <= now ||
      (user.resetCodeAttempts || 0) >= RESET_MAX_ATTEMPTS
    ) {
      return res.status(400).json(invalid);
    }

    const storedHash = user.resetCodeHash;

    if (!resetCodeMatches(code, storedHash)) {
      await User.updateOne(
        {
          _id: user._id,
          resetCodeHash: storedHash,
          resetCodeExpires: { $gt: now },
          resetCodeAttempts: { $lt: RESET_MAX_ATTEMPTS },
        },
        {
          $inc: { resetCodeAttempts: 1 },
        }
      );

      return res.status(400).json(invalid);
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Consume the reset code and invalidate existing sessions atomically.
    const result = await User.updateOne(
      {
        _id: user._id,
        resetCodeHash: storedHash,
        resetCodeExpires: { $gt: new Date() },
        resetCodeAttempts: { $lt: RESET_MAX_ATTEMPTS },
      },
      {
        $set: {
          passwordHash,
          resetCodeHash: null,
          resetCodeExpires: null,
          resetCodeAttempts: 0,
          failedLoginAttempts: 0,
          lockUntil: null,
        },
        $inc: {
          tokenVersion: 1,
        },
      }
    );

    if (result.modifiedCount !== 1) {
      return res.status(400).json(invalid);
    }

    return res.json({
      message: 'Password updated. You can now log in with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);

    return res.status(500).json({
      message: 'Server error. Please try again.',
    });
  }
});

// ---------------------------------------------------------------------------
// CHANGE PASSWORD
// ---------------------------------------------------------------------------

router.post(
  '/change-password',
  requireRole('student', 'faculty', 'guard', 'admin'),
  resetLimiter,
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          message: 'Enter your current and new password.',
        });
      }

      if (!isValidPassword(newPassword)) {
        return res.status(400).json({
          message: 'New password must be at least 8 characters and include a letter and a number.',
        });
      }

      const user = req.currentUser;
      const currentHash = user.passwordHash;

      const valid = await bcrypt.compare(
        String(currentPassword),
        currentHash
      );

      if (!valid) {
        return res.status(401).json({
          message: 'Current password is incorrect.',
        });
      }

      if (await bcrypt.compare(String(newPassword), currentHash)) {
        return res.status(400).json({
          message: 'New password must be different from the current one.',
        });
      }

      const newHash = await bcrypt.hash(String(newPassword), 10);

      // Invalidate every previously issued token for this account.
      const result = await User.updateOne(
        {
          _id: user._id,
          passwordHash: currentHash,
        },
        {
          $set: {
            passwordHash: newHash,
          },
          $inc: {
            tokenVersion: 1,
          },
        }
      );

      if (result.modifiedCount !== 1) {
        return res.status(409).json({
          message: 'Your password has changed. Please log in again.',
        });
      }

      return res.json({
        message: 'Password changed successfully. Please log in again.',
      });
    } catch (error) {
      console.error('Change password error:', error);

      return res.status(500).json({
        message: 'Server error. Please try again.',
      });
    }
  }
);

// ---------------------------------------------------------------------------
// PROFILE UPDATE
// ---------------------------------------------------------------------------

router.put(
  '/profile',
  requireRole('student', 'faculty', 'guard', 'admin'),
  async (req, res) => {
    try {
      const user = req.currentUser;

      const {
        surname,
        givenName,
        middleName,
        contactNumber,
        plateNumber,
        vehicleType,
        vehicleTypeOther,
        avatar,
      } = req.body;

      const updates = {};

      if (avatar !== undefined) {
        if (avatar === '' || avatar === null) {
          updates.avatar = '';
        } else if (
          typeof avatar !== 'string' ||
          !/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(avatar) ||
          avatar.length > 400000
        ) {
          return res.status(400).json({
            message: 'Profile picture must be a JPEG or PNG image under about 300 KB.',
          });
        } else {
          updates.avatar = avatar;
        }
      }

      const nameWasSubmitted =
        surname !== undefined || givenName !== undefined;

      if (nameWasSubmitted) {
        const nextSurname = surname !== undefined
          ? String(surname).trim()
          : String(user.surname || '').trim();

        const nextGivenName = givenName !== undefined
          ? String(givenName).trim()
          : String(user.givenName || '').trim();

        if (!nextSurname || !nextGivenName) {
          return res.status(400).json({
            message: 'Please provide both your surname and given name.',
          });
        }

        if (!isValidName(nextSurname)) {
          return res.status(400).json({
            message: 'Enter a valid surname.',
          });
        }

        if (!isValidName(nextGivenName)) {
          return res.status(400).json({
            message: 'Enter a valid given name.',
          });
        }

        updates.surname = nextSurname;
        updates.givenName = nextGivenName;
      }

      if (middleName !== undefined) {
        const value = String(middleName).trim();

        if (value && !isValidName(value)) {
          return res.status(400).json({
            message: 'Enter a valid middle name.',
          });
        }

        updates.middleName = value;
      }

      if (contactNumber !== undefined) {
        const value = String(contactNumber).trim();

        if (!CONTACT_RE.test(value)) {
          return res.status(400).json({
            message: 'Contact number must be an 11-digit number starting with 09.',
          });
        }

        updates.contactNumber = value;
      }

      const vehicleFieldsSent =
        plateNumber !== undefined ||
        vehicleType !== undefined ||
        vehicleTypeOther !== undefined;

      if (vehicleFieldsSent) {
        if (!['student', 'faculty'].includes(user.role)) {
          return res.status(400).json({
            message: 'Vehicle details are not used for this account type.',
          });
        }

        const newPlate = String(
          plateNumber ?? user.vehicle?.plateNumber ?? ''
        ).trim().toUpperCase();

        const newType =
          vehicleType ?? user.vehicle?.vehicleType;

        const newOther = String(
          vehicleTypeOther ?? user.vehicle?.vehicleTypeOther ?? ''
        ).trim();

        const changed =
          newPlate !== (user.vehicle?.plateNumber || '') ||
          newType !== user.vehicle?.vehicleType ||
          (
            newType === 'other' &&
            newOther !== (user.vehicle?.vehicleTypeOther || '')
          );

        if (changed) {
          if (!PLATE_RE.test(newPlate)) {
            return res.status(400).json({
              message: 'Please provide a valid plate number.',
            });
          }

          if (!VEHICLE_TYPE_KEYS.includes(newType)) {
            return res.status(400).json({
              message: 'Please select a valid vehicle type.',
            });
          }

          if (newType === 'other' && !newOther) {
            return res.status(400).json({
              message: 'Please specify your vehicle type.',
            });
          }

          const parked = await ParkingTransaction.findOne({
            user: user._id,
            status: 'ACTIVE',
          });

          if (parked) {
            return res.status(409).json({
              message: 'You cannot change vehicle details while your vehicle is parked. Check out first.',
            });
          }

          const taken = await User.findOne({
            'vehicle.plateNumber': newPlate,
            _id: { $ne: user._id },
          });

          if (taken) {
            return res.status(400).json({
              message: 'This plate number is already registered.',
            });
          }

          updates.vehicle = {
            plateNumber: newPlate,
            vehicleType: newType,
            vehicleTypeOther: newType === 'other' ? newOther : '',
          };
        }
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          message: 'No valid profile changes were submitted.',
        });
      }

      const updatedUser = await User.findByIdAndUpdate(
        user._id,
        { $set: updates },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!updatedUser) {
        return res.status(404).json({
          message: 'Account not found.',
        });
      }

      return res.json({
        message: 'Profile updated.',
        user: buildUserResponse(updatedUser),
      });
    } catch (error) {
      console.error('Update profile error:', error);

      if (error.code === 11000) {
        return res.status(409).json({
          message: 'This plate number is already registered.',
        });
      }

      return res.status(500).json({
        message: 'Server error. Please try again.',
      });
    }
  }
);

module.exports = router;
