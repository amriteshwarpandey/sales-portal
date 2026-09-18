const mongoose = require('mongoose');

const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];

const customerSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    city: { type: String, trim: true },
    notes: { type: String, trim: true, maxlength: 2000 },
    // Referral ID of the employee who brought this customer in.
    referralId: { type: String, required: true, uppercase: true, index: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    plan: { type: String, required: true },
    // Amount in the smallest currency unit (paise).
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'pending', index: true },
    payment: {
      orderId: String,
      transactionId: String,
      method: String,
      paidAt: Date,
      confirmedBy: String,
    },
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

module.exports = mongoose.model('Customer', customerSchema);
module.exports.PAYMENT_STATUSES = PAYMENT_STATUSES;
