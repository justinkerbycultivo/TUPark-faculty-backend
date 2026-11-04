const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

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

const LOCKOUT_THRESHOLD = 3;
const LOCKOUT_MS = 60 * 1000;

// GET /api/auth/captcha — used on the registration screen only.
router.get('/captcha', (req, res) => {
  const { captchaId, question } = generateCaptcha();
  res.json({ captchaId, question });
});

// Splits "Surname, Given Middle" OR "Given Middle Surname" style full names
// into parts. We expect the client to send separate fields, but keep this
// resilient: prefer explicit surname/givenName/middleName fields if present.
function resolveNameParts(body) {
  if (body.surname && body.givenName) {
    return {
      surname: String(body.surname).trim(),
      givenName: String(body.givenName).trim(),
      middleName: body.middleName ? String(body.middleName).trim() : '',
    };
  }
  return null;
}

// POST /api/auth/register
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

    // Only student and guard self-registration exist. Anything else (admin,
    // faculty, unknown) is rejected here; the role is decided by this server,
    // never copied from the request.
    if (!['student', 'guard'].includes(accountType)) {
      return res.status(400).json({ message: 'Invalid account type. Choose Student or Guard.' });
    }

    if (accountType === 'guard') {
      const GUARD_ID_RE = /^[A-Za-z0-9-]{3,20}$/;
      if (!nameParts || !studentId || !email || !contactNumber || !password) {
        return res.status(400).json({ message: 'Please fill in all required fields.' });
      }
      if (agreedToTerms !== true) {
        return res.status(400).json({ message: 'You must agree to the terms and conditions to register.' });
      }
      if (!verifyCaptcha(captchaId, captchaAnswer)) {
        return res.status(400).json({ message: 'CAPTCHA verification failed. Please try again.' });
      }
      if (!EMAIL_RE.test(email)) return res.status(400).json({ message: 'Please provide a valid email address.' });
      if (!GUARD_ID_RE.test(String(studentId))) {
        return res.status(400).json({ message: 'Guard ID must be 3-20 letters, numbers or dashes.' });
      }
      if (!CONTACT_RE.test(contactNumber)) {
        return res.status(400).json({ message: 'Contact number must be an 11-digit number starting with 09.' });
      }
      if (!PASSWORD_RE.test(password)) {
        return res.status(400).json({ message: 'Password must be at least 8 characters and include letters and numbers.' });
      }
      const guardEmail = email.toLowerCase();
      if (await User.findOne({ email: guardEmail })) {
        return res.status(400).json({ message: 'This university account is already registered.' });
      }
      if (await User.findOne({ studentId })) {
        return res.status(400).json({ message: 'This ID is already registered.' });
      }
      const guard = await User.create({
        surname: nameParts.surname,
        givenName: nameParts.givenName,
        middleName: nameParts.middleName,
        studentId,
        email: guardEmail,
        contactNumber,
        passwordHash: await bcrypt.hash(password, 10),
        role: 'guard',
        approvalStatus: 'pending',
        agreedToTerms: true,
      });
      return res.status(201).json({
        message: 'Guard registration submitted. Your account is pending admin approval. You can log in once it is approved.',
        pendingApproval: true,
        user: { id: guard._id, formattedName: guard.formattedName(), email: guard.email, role: guard.role },
      });
    }

    if (!nameParts || !studentId || !email || !contactNumber || !password || !plateNumber || !vehicleType) {
      return res.status(400).json({ message: 'Please fill in all required fields.' });
    }

    if (agreedToTerms !== true) {
      return res.status(400).json({ message: 'You must agree to the terms and conditions to register.' });
    }

    if (!verifyCaptcha(captchaId, captchaAnswer)) {
      return res.status(400).json({ message: 'CAPTCHA verification failed. Please try again.' });
    }

    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }
    if (!STUDENT_ID_RE.test(studentId)) {
      return res.status(400).json({ message: 'Student ID must be in the format 0000-0000.' });
    }
    if (!CONTACT_RE.test(contactNumber)) {
      return res.status(400).json({ message: 'Contact number must be an 11-digit number starting with 09.' });
    }
    if (!PLATE_RE.test(plateNumber)) {
      return res.status(400).json({ message: 'Please provide a valid plate number.' });
    }
    if (!PASSWORD_RE.test(password)) {
      return res
        .status(400)
        .json({ message: 'Password must be at least 8 characters and include letters and numbers.' });
    }
    if (!VEHICLE_TYPE_KEYS.includes(vehicleType)) {
      return res.status(400).json({ message: 'Please select a valid vehicle type.' });
    }
    if (vehicleType === 'other' && !vehicleTypeOther) {
      return res.status(400).json({ message: 'Please specify your vehicle type.' });
    }

    const normalizedEmail = email.toLowerCase();

    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) {
      return res.status(400).json({ message: 'This university account is already registered.' });
    }

    const existingStudentId = await User.findOne({ studentId });
    if (existingStudentId) {
      return res.status(400).json({ message: 'This Student ID is already registered.' });
    }

    const existingPlate = await User.findOne({ 'vehicle.plateNumber': plateNumber.toUpperCase() });
    if (existingPlate) {
      return res.status(400).json({ message: 'This plate number is already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Role is never trusted from the client at registration — it can only
    // be changed later by an admin via a dedicated endpoint.
    const user = await User.create({
      surname: nameParts.surname,
      givenName: nameParts.givenName,
      middleName: nameParts.middleName,
      studentId,
      email: normalizedEmail,
      contactNumber,
      passwordHash,
      role: 'student',
      vehicle: {
        plateNumber: plateNumber.toUpperCase(),
        vehicleType,
        vehicleTypeOther: vehicleType === 'other' ? vehicleTypeOther : '',
      },
      agreedToTerms: true,
    });

    res.status(201).json({
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
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

// POST /api/auth/login — no CAPTCHA here.
router.post('/login', async (req, res) => {
  try {
    const { identifier, email, studentId, password } = req.body;
    const lookupValue = identifier || email || studentId;

    if (!lookupValue || !password) {
      return res.status(400).json({ message: 'Please enter your email/Student ID and password.' });
    }

    const user = await User.findOne({
      $or: [{ email: String(lookupValue).toLowerCase() }, { studentId: lookupValue }],
    });

    if (!user) {
      return res.status(404).json({ message: 'Account not found.' });
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      const lockedForSeconds = Math.ceil((user.lockUntil.getTime() - Date.now()) / 1000);
      return res.status(423).json({
        message: `Account temporarily locked. Try again in ${lockedForSeconds} seconds.`,
        lockedForSeconds,
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      user.failedLoginAttempts += 1;

      if (user.failedLoginAttempts >= LOCKOUT_THRESHOLD) {
        user.lockUntil = new Date(Date.now() + LOCKOUT_MS);
        user.failedLoginAttempts = 0;
        await user.save();
        const lockedForSeconds = Math.ceil(LOCKOUT_MS / 1000);
        return res.status(423).json({
          message: `Account temporarily locked. Try again in ${lockedForSeconds} seconds.`,
          lockedForSeconds,
        });
      }

      await user.save();
      const attemptsLeft = LOCKOUT_THRESHOLD - user.failedLoginAttempts;
      return res.status(401).json({
        message: `Incorrect password. ${attemptsLeft} attempt(s) left before lockout.`,
      });
    }

    // Correct password, but the account is not cleared to use the app yet.
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

    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    res.status(200).json({
      message: 'Login successful.',
      role: user.role,
      user: {
        id: user._id,
        formattedName: user.formattedName(),
        surname: user.surname,
        givenName: user.givenName,
        middleName: user.middleName,
        studentId: user.studentId,
        email: user.email,
        contactNumber: user.contactNumber,
        role: user.role,
        vehicle: user.vehicle,
        qrToken: user.qrToken,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// ---------------------------------------------------------------------------
// Password reset (6-digit emailed code) and change password
// ---------------------------------------------------------------------------
const RESET_CODE_TTL_MS = 15 * 60 * 1000;
const RESET_MAX_ATTEMPTS = 5;
const GENERIC_FORGOT_MESSAGE =
  'If that email is registered, a 6-digit reset code has been sent. It expires in 15 minutes.';

const hashCode = (code) => crypto.createHash('sha256').update(String(code)).digest('hex');

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

// POST /api/auth/forgot-password  { email }
// Always answers with the same message so it never reveals whether an
// email is registered.
router.post('/forgot-password', forgotLimiter, async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }

    const user = await User.findOne({ email });
    if (user) {
      const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
      user.resetCodeHash = hashCode(code);
      user.resetCodeExpires = new Date(Date.now() + RESET_CODE_TTL_MS);
      user.resetCodeAttempts = 0;
      await user.save();

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
        // Local development only: print the code to the server console when
        // explicitly enabled. Never enable this in production.
        if (process.env.RESET_DEV_LOG === 'true' && process.env.NODE_ENV !== 'production') {
          console.log(`[DEV ONLY] Reset code for ${user.email}: ${code}`);
        }
      }
    }
    res.json({ message: GENERIC_FORGOT_MESSAGE, emailConfigured: smtpConfigured() });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

// POST /api/auth/reset-password  { email, code, newPassword }
router.post('/reset-password', resetLimiter, async (req, res) => {
  const invalid = { message: 'That code is invalid or has expired. Request a new one.' };
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const code = String(req.body.code || '').trim();
    const { newPassword } = req.body;

    if (!EMAIL_RE.test(email) || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ message: 'Enter your email and the 6-digit code.' });
    }
    if (!PASSWORD_RE.test(String(newPassword || ''))) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters and include a letter and a number.',
      });
    }

    const user = await User.findOne({ email }).select(
      '+resetCodeHash +resetCodeExpires +resetCodeAttempts'
    );
    if (!user || !user.resetCodeHash || !user.resetCodeExpires || user.resetCodeExpires < new Date()) {
      return res.status(400).json(invalid);
    }
    if (user.resetCodeAttempts >= RESET_MAX_ATTEMPTS) {
      user.resetCodeHash = null;
      user.resetCodeExpires = null;
      await user.save();
      return res.status(400).json(invalid);
    }

    const given = Buffer.from(hashCode(code));
    const stored = Buffer.from(user.resetCodeHash);
    if (given.length !== stored.length || !crypto.timingSafeEqual(given, stored)) {
      user.resetCodeAttempts += 1;
      await user.save();
      return res.status(400).json(invalid);
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.resetCodeHash = null; // single use
    user.resetCodeExpires = null;
    user.resetCodeAttempts = 0;
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    res.json({ message: 'Password updated. You can now log in with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});

// POST /api/auth/change-password  { currentPassword, newPassword }
// Requires the caller to be identified (x-user-id) AND to know the current password.
router.post(
  '/change-password',
  requireRole('student', 'faculty', 'guard', 'admin'),
  resetLimiter,
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Enter your current and new password.' });
      }
      if (!PASSWORD_RE.test(String(newPassword))) {
        return res.status(400).json({
          message: 'New password must be at least 8 characters and include a letter and a number.',
        });
      }
      const user = req.currentUser;
      const ok = await bcrypt.compare(String(currentPassword), user.passwordHash);
      if (!ok) {
        return res.status(401).json({ message: 'Current password is incorrect.' });
      }
      if (await bcrypt.compare(String(newPassword), user.passwordHash)) {
        return res.status(400).json({ message: 'New password must be different from the current one.' });
      }
      user.passwordHash = await bcrypt.hash(String(newPassword), 10);
      await user.save();
      res.json({ message: 'Password changed successfully.' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ message: 'Server error. Please try again.' });
    }
  }
);

// PUT /api/auth/profile — edit your OWN profile. Email, Student ID and role
// are identity fields and cannot be changed here. Vehicle details can only
// be changed (students/faculty) while the vehicle is not currently parked.
const NAME_RE = /^[A-Za-zÀ-ÿ.'\- ]{1,60}$/;
router.put(
  '/profile',
  requireRole('student', 'faculty', 'guard', 'admin'),
  async (req, res) => {
    try {
      const user = req.currentUser;
      const { surname, givenName, middleName, contactNumber, plateNumber, vehicleType, vehicleTypeOther } = req.body;

      if (surname !== undefined) {
        if (!NAME_RE.test(String(surname).trim())) return res.status(400).json({ message: 'Enter a valid surname.' });
        user.surname = String(surname).trim();
      }
      if (givenName !== undefined) {
        if (!NAME_RE.test(String(givenName).trim())) return res.status(400).json({ message: 'Enter a valid given name.' });
        user.givenName = String(givenName).trim();
      }
      if (middleName !== undefined) {
        const mn = String(middleName).trim();
        if (mn && !NAME_RE.test(mn)) return res.status(400).json({ message: 'Enter a valid middle name.' });
        user.middleName = mn;
      }
      if (contactNumber !== undefined) {
        if (!CONTACT_RE.test(String(contactNumber).trim())) {
          return res.status(400).json({ message: 'Contact number must be an 11-digit number starting with 09.' });
        }
        user.contactNumber = String(contactNumber).trim();
      }

      const vehicleFieldsSent = plateNumber !== undefined || vehicleType !== undefined;
      if (vehicleFieldsSent) {
        if (!['student', 'faculty'].includes(user.role)) {
          return res.status(400).json({ message: 'Vehicle details are not used for this account type.' });
        }
        const newPlate = String(plateNumber ?? user.vehicle?.plateNumber ?? '').trim().toUpperCase();
        const newType = vehicleType ?? user.vehicle?.vehicleType;
        const newOther = String(vehicleTypeOther ?? user.vehicle?.vehicleTypeOther ?? '').trim();
        const changed =
          newPlate !== user.vehicle?.plateNumber ||
          newType !== user.vehicle?.vehicleType ||
          (newType === 'other' && newOther !== (user.vehicle?.vehicleTypeOther || ''));

        if (changed) {
          if (!PLATE_RE.test(newPlate)) return res.status(400).json({ message: 'Please provide a valid plate number.' });
          if (!VEHICLE_TYPE_KEYS.includes(newType)) return res.status(400).json({ message: 'Please select a valid vehicle type.' });
          if (newType === 'other' && !newOther) return res.status(400).json({ message: 'Please specify your vehicle type.' });

          const parked = await ParkingTransaction.findOne({ user: user._id, status: 'ACTIVE' });
          if (parked) {
            return res.status(409).json({ message: 'You cannot change vehicle details while your vehicle is parked. Check out first.' });
          }
          const taken = await User.findOne({ 'vehicle.plateNumber': newPlate, _id: { $ne: user._id } });
          if (taken) return res.status(400).json({ message: 'This plate number is already registered.' });

          user.vehicle = { plateNumber: newPlate, vehicleType: newType, vehicleTypeOther: newType === 'other' ? newOther : '' };
        }
      }

      await user.save();
      res.json({
        message: 'Profile updated.',
        user: {
          id: user._id,
          formattedName: user.formattedName(),
          surname: user.surname,
          givenName: user.givenName,
          middleName: user.middleName,
          studentId: user.studentId,
          email: user.email,
          contactNumber: user.contactNumber,
          role: user.role,
          vehicle: user.vehicle,
          qrToken: user.qrToken,
        },
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ message: 'Server error. Please try again.' });
    }
  }
);

module.exports = router;
