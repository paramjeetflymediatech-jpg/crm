const nodemailer = require('nodemailer');

require('dotenv').config();

const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT || 2525;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM || 'no-reply@crmsaas.com';

let transporter = null;

if (smtpHost && smtpUser && smtpPass) {
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(smtpPort, 10),
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });
  console.log(`Mailer configured with SMTP Host: ${smtpHost}:${smtpPort}`);
} else {
  console.log('Mailer running in development mock mode (no SMTP configs found in .env).');
}

/**
 * Sends an email notification
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Plain text body
 * @param {string} html - HTML body template
 */
async function sendEmail({ to, subject, text, html }) {
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: smtpFrom,
        to,
        subject,
        text,
        html
      });
      console.log(`Email successfully sent to ${to}: ${info.messageId}`);
      return info;
    } catch (error) {
      console.error(`Failed to send email to ${to}:`, error);
      return null;
    }
  } else {
    console.log('--- [MOCK EMAIL SENT] ---');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content:\n${text}`);
    console.log('-------------------------');
    return { mock: true };
  }
}

module.exports = {
  sendEmail
};
