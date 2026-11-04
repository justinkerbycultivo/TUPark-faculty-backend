const nodemailer = require('nodemailer');

// SMTP settings come ONLY from environment variables (see .env.example).
// If they are missing, sendMail() reports { sent: false } so the caller can
// log it; it never pretends an email was delivered.
function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transporter = null;
function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

async function sendMail({ to, subject, text }) {
  if (!smtpConfigured()) return { sent: false, reason: 'SMTP is not configured' };
  try {
    await getTransporter().sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
    });
    return { sent: true };
  } catch (err) {
    console.error('Mail send failed:', err.message);
    return { sent: false, reason: err.message };
  }
}

module.exports = { sendMail, smtpConfigured };
