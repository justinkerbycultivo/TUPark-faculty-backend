const crypto = require('crypto');

const TTL_MS = 5 * 60 * 1000; // 5 minutes
const store = new Map(); // captchaId -> { answer, expiresAt }

function cleanupExpired() {
  const now = Date.now();
  for (const [id, entry] of store.entries()) {
    if (entry.expiresAt <= now) store.delete(id);
  }
}

function generateCaptcha() {
  cleanupExpired();
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  const captchaId = crypto.randomUUID();
  store.set(captchaId, { answer: a + b, expiresAt: Date.now() + TTL_MS });
  return { captchaId, question: `What is ${a} + ${b}?` };
}

// Single-use: deletes the entry regardless of outcome.
function verifyCaptcha(captchaId, answer) {
  if (!captchaId) return false;
  const entry = store.get(captchaId);
  store.delete(captchaId);
  if (!entry) return false;
  if (entry.expiresAt <= Date.now()) return false;
  const numericAnswer = Number(answer);
  return !Number.isNaN(numericAnswer) && numericAnswer === entry.answer;
}

module.exports = { generateCaptcha, verifyCaptcha };
