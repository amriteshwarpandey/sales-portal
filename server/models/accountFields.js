// Fields and JSON handling shared by every account that can log in (admins and employees).

const accountFields = {
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  // Email-change OTP. Stored hashed; never returned by the API.
  otp: { type: String, select: false },
  otpCreatedAt: { type: Date, select: false },
  otpAttempts: { type: Number, default: 0, select: false },
  otpVerifiedAt: { type: Date, select: false },
};

const SECRET_FIELDS = ['password', 'otp', 'otpCreatedAt', 'otpAttempts', 'otpVerifiedAt', '__v'];

function hideSecrets(_doc, ret) {
  for (const field of SECRET_FIELDS) delete ret[field];
  return ret;
}

module.exports = { accountFields, hideSecrets };
