const crypto = require('crypto');

// Simple in-memory CAPTCHA store. Good enough for a campus-scale app;
// for production you'd swap this for Google reCAPTCHA / hCaptcha.
const captchas = new Map(); // captchaId -> { answer, expiresAt }

const TTL_MS = 5 * 60 * 1000; // captcha expires after 5 minutes

function cleanup() {
  const now = Date.now();
  for (const [id, entry] of captchas.entries()) {
    if (entry.expiresAt < now) captchas.delete(id);
  }
}

function generateCaptcha() {
  cleanup();
  const a = Math.floor(Math.random() * 8) + 1; // 1-8
  const b = Math.floor(Math.random() * 8) + 1; // 1-8
  const id = crypto.randomUUID();
  captchas.set(id, { answer: a + b, expiresAt: Date.now() + TTL_MS });
  return { captchaId: id, question: `${a} + ${b} = ?` };
}

// Single-use: verifying (correctly or not) removes the captcha.
function verifyCaptcha(captchaId, answer) {
  const entry = captchas.get(captchaId);
  captchas.delete(captchaId);
  if (!entry) return false;
  if (entry.expiresAt < Date.now()) return false;
  return Number(answer) === entry.answer;
}

module.exports = { generateCaptcha, verifyCaptcha };
