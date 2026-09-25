// In-memory store for OTPs during development/demo
// Format: { email: { otp: string, expiresAt: number } }
const otps = new Map();

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function saveOTP(email, otp, validityMinutes = 10) {
  const expiresAt = Date.now() + validityMinutes * 60 * 1000;
  otps.set(email, { otp, expiresAt });
}

function verifyOTP(email, otp) {
  const record = otps.get(email);
  if (!record) {
    return { valid: false, message: 'OTP not found or expired' };
  }
  if (Date.now() > record.expiresAt) {
    otps.delete(email);
    return { valid: false, message: 'OTP has expired' };
  }
  if (record.otp !== otp) {
    return { valid: false, message: 'Invalid OTP' };
  }
  // OTP is valid, remove it
  otps.delete(email);
  return { valid: true, message: 'OTP verified successfully' };
}

module.exports = {
  generateOTP,
  saveOTP,
  verifyOTP,
};
