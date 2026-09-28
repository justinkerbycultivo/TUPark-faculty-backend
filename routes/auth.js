const express = require('express');
const bcrypt = require('bcryptjs');

const router = express.Router();
const User = require('../models/User');
const { generateCaptcha, verifyCaptcha } = require('../utils/captcha');

const MAX_ATTEMPTS = 3;
const LOCK_DURATION_MS = 60 * 1000; // 1 minute

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// TUPC-style student ID, e.g. 2021-00001 or TUPC-21-0001. Kept permissive
// (4 digits, dash, 4-6 digits) so real ID formats aren't rejected.
const STUDENT_ID_RE = /^\d{4}-\d{4,6}$/;
const CONTACT_RE = /^09\d{9}$/; // PH mobile format: 09XXXXXXXXX (11 digits)
const PLATE_RE = /^[A-Z0-9\- ]{5,10}$/i;
// At least 8 chars, one letter, one number.
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

function publicUser(user) {
  return {
    id: user._id,
    surname: user.surname,
    givenName: user.givenName,
    middleName: user.middleName,
    formattedName: user.formattedName(),
    studentId: user.studentId,
    email: user.email,
    contactNumber: user.contactNumber,
    vehicle: user.vehicle,
    role: user.role,
    qrToken: user.qrToken,
  };
}

// GET /api/auth/captcha -> now used by REGISTRATION only, not login
router.get('/captcha', (req, res) => {
  res.json(generateCaptcha());
});

// Register (Week 2 + Week 4) — CAPTCHA + full server-side field validation.
// NOTE: real Google/GSFE OAuth is not implemented. This endpoint is where
// it would be plugged in — the school email is already enforced as the
// unique account identifier in the User schema.
router.post('/register', async (req, res) => {
  console.log('[auth] POST /register body:', { ...req.body, password: '(hidden)' });
  try {
    const {
      surname, givenName, middleName, studentId, email, contactNumber,
      password, confirmPassword, plateNumber, vehicleType,
      captchaId, captchaAnswer, agreedToTerms,
    } = req.body;

    // Required fields
    if (!surname || !givenName || !studentId || !email || !contactNumber || !password || !plateNumber || !vehicleType) {
      return res.status(400).json({ message: 'Please fill in all required fields, including vehicle info.' });
    }
    if (!agreedToTerms) {
      return res.status(400).json({ message: 'You must agree to the TUPark Terms and Conditions.' });
    }
    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({ message: 'Password and confirm password do not match.' });
    }

    // Format validation (never trust the client to have already done this)
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }
    if (!STUDENT_ID_RE.test(studentId)) {
      return res.status(400).json({ message: 'Student ID must be in the format YYYY-NNNNN (e.g. 2021-00001).' });
    }
    if (!CONTACT_RE.test(contactNumber)) {
      return res.status(400).json({ message: 'Contact number must be a valid PH mobile number (e.g. 09171234567).' });
    }
    if (!PASSWORD_RE.test(password)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters and include a letter and a number.' });
    }
    if (!PLATE_RE.test(plateNumber)) {
      return res.status(400).json({ message: 'Please enter a valid vehicle plate number.' });
    }
    if (!['car', 'motorcycle'].includes(vehicleType)) {
      return res.status(400).json({ message: 'Vehicle type must be car or motorcycle.' });
    }

    // CAPTCHA (registration only)
    if (!captchaId || captchaAnswer === undefined || captchaAnswer === null) {
      return res.status(400).json({ message: 'Please complete the CAPTCHA.' });
    }
    if (!verifyCaptcha(captchaId, captchaAnswer)) {
      return res.status(400).json({ message: 'Incorrect CAPTCHA answer.', captchaFailed: true });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) {
      return res.status(400).json({ message: 'This university account is already registered.' });
    }

    const existingStudentId = await User.findOne({ studentId });
    if (existingStudentId) {
      return res.status(400).json({ message: 'This Student ID is already registered.' });
    }

    const existingPlate = await User.findOne({ 'vehicle.plateNumber': plateNumber.trim().toUpperCase() });
    if (existingPlate) {
      return res.status(400).json({ message: 'This vehicle plate number is already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      surname,
      givenName,
      middleName: middleName || '',
      studentId,
      email: normalizedEmail,
      contactNumber,
      passwordHash,
      vehicle: {
        plateNumber: plateNumber.trim().toUpperCase(),
        vehicleType,
      },
    });

    res.status(201).json({
      message: 'Account created successfully',
      user: publicUser(user),
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'This account, Student ID, or vehicle plate is already registered.' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Login (Week 1) — NO CAPTCHA (moved to registration). Distinct, clear
// error messages instead of a single generic one.
router.post('/login', async (req, res) => {
  console.log('[auth] POST /login body:', { ...req.body, password: '(hidden)' });
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter your email and password.' });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ message: 'Account not found.' });
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      const secondsLeft = Math.ceil((user.lockUntil.getTime() - Date.now()) / 1000);
      return res.status(423).json({
        message: `Account locked due to too many failed attempts. Try again in ${secondsLeft}s.`,
        lockedForSeconds: secondsLeft,
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      user.failedLoginAttempts += 1;

      if (user.failedLoginAttempts >= MAX_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
        user.failedLoginAttempts = 0;
        await user.save();
        return res.status(423).json({
          message: 'Too many failed attempts. Account locked for 1 minute.',
          lockedForSeconds: LOCK_DURATION_MS / 1000,
        });
      }

      await user.save();
      return res.status(401).json({
        message: `Incorrect password. ${MAX_ATTEMPTS - user.failedLoginAttempts} attempt(s) left before lockout.`,
      });
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    res.status(200).json({
      message: 'Login successful',
      user: publicUser(user),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
