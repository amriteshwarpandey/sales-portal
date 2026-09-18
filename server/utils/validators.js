const mongoose = require('mongoose');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isEmail(value) {
  return typeof value === 'string' && value.length <= 254 && EMAIL_RE.test(value.trim());
}

function isObjectId(value) {
  return typeof value === 'string' && mongoose.isValidObjectId(value) && /^[a-f\d]{24}$/i.test(value);
}

function isHttpUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isStrongPassword(value) {
  return typeof value === 'string' && value.length >= 8 && value.length <= 128;
}

/** Returns the names of required fields that are missing or blank. */
function missingFields(body, fields) {
  return fields.filter((field) => {
    const value = body?.[field];
    return value === undefined || value === null || String(value).trim() === '';
  });
}

/** Escape user input before using it inside a RegExp. */
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toStr(value) {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
}

module.exports = { isEmail, isObjectId, isHttpUrl, isStrongPassword, missingFields, escapeRegex, toStr };
