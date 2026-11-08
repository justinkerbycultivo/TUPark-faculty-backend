
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

function getSender() {
  const configured = process.env.MAIL_FROM || '';

  // Supports: TUPark System <sender@example.com>
  const match = configured.match(/^(.*?)\s*<([^<>]+)>$/);

  if (match) {
    return {
      name: match[1].trim() || 'TUPark System',
      email: match[2].trim(),
    };
  }

  return {
    name: 'TUPark System',
    email: configured.trim(),
  };
}

function brevoConfigured() {
  return Boolean(
    process.env.BREVO_API_KEY &&
    process.env.MAIL_FROM &&
    getSender().email
  );
}

// Retain the existing function name for compatibility
// with backend/routes/auth.js.
function smtpConfigured() {
  return brevoConfigured();
}

async function sendMail({ to, subject, text }) {
  if (!brevoConfigured()) {
    return {
      sent: false,
      reason: 'Brevo API is not configured',
    };
  }

  try {
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: getSender(),
        to: [{ email: to }],
        subject,
        textContent: text,
      }),
      signal: AbortSignal.timeout(15000),
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error(
        'Brevo API error:',
        response.status,
        responseText.slice(0, 1000)
      );

      return {
        sent: false,
        reason: `Brevo API returned HTTP ${response.status}`,
      };
    }

    return { sent: true };
  } catch (error) {
    console.error('Brevo API request failed:', error.message);

    return {
      sent: false,
      reason: error.message || 'Brevo API request failed',
    };
  }
}

module.exports = {
  sendMail,
  smtpConfigured,
  brevoConfigured,
};
