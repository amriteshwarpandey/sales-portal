const mongoose = require('mongoose');
const { accountFields, hideSecrets } = require('./accountFields');

const employeeSchema = new mongoose.Schema(
  {
    ...accountFields,
    phone: { type: String, trim: true },
    referralId: { type: String, required: true, unique: true, uppercase: true },
    college: String,
    state: String,
    branch: String,
    degree: String,
    passingYear: Number,
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate' },
    createdBy: String,
    totalCustomers: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: { transform: hideSecrets } }
);

employeeSchema.virtual('fullName').get(function fullName() {
  return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('Employee', employeeSchema);
