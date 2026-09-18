const nodemailer = require('nodemailer');
const config = require('../config/config');

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: config.email, pass: config.emailPassword },
    });
  }
  return transporter;
}

// When no Gmail credentials are configured (development/tests), emails are kept
// in this in-memory outbox and printed to the console instead of being sent.
const outbox = [];
const OUTBOX_LIMIT = 50;

function isMailConfigured() {
  return Boolean(config.email && config.emailPassword);
}

/**
 * Send an email.
 * @param {{ to: string, subject: string, html: string }} message
 */
async function sendEmail({ to, subject, html }) {
  if (!isMailConfigured()) {
    outbox.push({ to, subject, html, at: new Date() });
    if (outbox.length > OUTBOX_LIMIT) outbox.shift();
    if (!config.isTest) {
      const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      console.log(`[email:dev] to=${to} subject="${subject}"\n  ${text}`);
    }
    return { mocked: true };
  }

  try {
    return await getTransporter().sendMail({ from: config.email, to, subject, html });
  } catch (error) {
    console.error('[email] failed to send:', error.message);
    throw error;
  }
}

/**
 * The SendEmail helper from the spec: sends an internal notification to HR.
 */
function sendEmailToHR(subject, htmlContent) {
  return sendEmail({ to: config.hrEmail, subject, html: htmlContent });
}

module.exports = { sendEmail, sendEmailToHR, outbox, isMailConfigured };
