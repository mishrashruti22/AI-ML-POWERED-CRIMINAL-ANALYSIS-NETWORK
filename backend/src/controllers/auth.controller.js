const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/db');
const sessionService = require('../services/session.service');
const otpStore = require('../utils/otpStore');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev';

exports.register = async (req, res) => {
  try {
    const { fullName, departmentId, email, password, confirmPassword } = req.body;

    if (!fullName || !departmentId || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const upperDeptId = departmentId.toUpperCase();
    const deptIdRegex = /^[A-Z]{3}[0-9]{2}$/;
    if (!deptIdRegex.test(upperDeptId)) {
      return res.status(400).json({ error: 'Department ID must be in the format AAA99 (e.g., ABC20)' });
    }

    const duplicateCheck = await db.query(
      'SELECT email, "departmentId" FROM "user" WHERE email = $1 OR "departmentId" = $2',
      [email, upperDeptId]
    );

    if (duplicateCheck.rows.length > 0) {
      const existingUser = duplicateCheck.rows[0];
      if (existingUser.email === email) {
        return res.status(409).json({ error: 'Email already exists' });
      } else {
        return res.status(409).json({ error: 'Department ID already exists' });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();
    const role = 'INVESTIGATOR';
    const emailVerified = true;
    const now = new Date();

    const insertResult = await db.query(
      'INSERT INTO "user" (id, "fullName", "departmentId", email, "passwordHash", role, "emailVerified", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, "fullName", email, "departmentId", role',
      [id, fullName, upperDeptId, email, passwordHash, role, emailVerified, now, now]
    );

    const newUser = insertResult.rows[0];
    res.status(201).json({
      message: 'User registered successfully. Please verify your email.',
      user: newUser
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
};

exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const userCheck = await db.query('SELECT id FROM "user" WHERE email = $1', [email]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const otp = otpStore.generateOTP();
    otpStore.saveOTP(email, otp);

    console.log('[DEV MODE] OTP for ' + email + ' is: ' + otp);

    res.status(200).json({ message: 'OTP generated and printed to console (DEV MODE)' });
  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

    const verification = otpStore.verifyOTP(email, otp);
    if (!verification.valid) {
      return res.status(400).json({ error: verification.message });
    }

    await db.query('UPDATE "user" SET "emailVerified" = true, "updatedAt" = $1 WHERE email = $2', [new Date(), email]);

    res.status(200).json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, departmentId, password } = req.body;
    const rawIdentifier = (email || departmentId || '').trim();
    if (!rawIdentifier || !password) return res.status(400).json({ error: 'Email/Department ID and password are required' });

    const userResult = await db.query(
      'SELECT * FROM "user" WHERE LOWER(email) = LOWER($1) OR UPPER("departmentId") = UPPER($1)',
      [rawIdentifier]
    );
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userResult.rows[0];

    if (!user.emailVerified) {
      return res.status(403).json({ error: 'Please verify your email before logging in' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, fullName: user.fullName, departmentId: user.departmentId },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Track session (fire-and-forget — login still succeeds if this fails)
    try {
      await sessionService.createSession(user.id);
    } catch (sessionErr) {
      console.error('Session creation error (non-blocking):', sessionErr.message);
    }

    res.status(200).json({
      message: 'Logged in successfully',
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        departmentId: user.departmentId,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const userCheck = await db.query('SELECT id FROM "user" WHERE email = $1', [email]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const otp = otpStore.generateOTP();
    otpStore.saveOTP(email, otp);

    console.log('[DEV MODE] Forgot Password OTP for ' + email + ' is: ' + otp);

    res.status(200).json({ message: 'OTP sent to email (DEV MODE console)' });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword, confirmNewPassword } = req.body;

    if (!email || !otp || !newPassword || !confirmNewPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    const verification = otpStore.verifyOTP(email, otp);
    if (!verification.valid) {
      return res.status(400).json({ error: verification.message });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE "user" SET "passwordHash" = $1, "updatedAt" = $2 WHERE email = $3', [passwordHash, new Date(), email]);

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.logout = async (req, res) => {
  try {
    // Close all active sessions for this user
    await sessionService.closeSession(req.user.id);
  } catch (err) {
    console.error('Session close error (non-blocking):', err.message);
  }
  res.status(200).json({ message: 'Logged out successfully. Please remove the token on the client side.' });
};

exports.me = (req, res) => {
  res.status(200).json({
    user: req.user
  });
};
