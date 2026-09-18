const mongoose = require('mongoose');
const { accountFields, hideSecrets } = require('./accountFields');

const adminSchema = new mongoose.Schema(
  {
    ...accountFields,
    adminId: { type: String, required: true, unique: true },
    // The master admin is an admin with elevated rights (manages other admins).
    role: { type: String, enum: ['admin', 'masteradmin'], default: 'admin' },
  },
  { timestamps: true, toJSON: { transform: hideSecrets } }
);

adminSchema.virtual('fullName').get(function fullName() {
  return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('Admin', adminSchema);
