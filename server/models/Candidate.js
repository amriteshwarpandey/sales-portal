const mongoose = require('mongoose');

const CANDIDATE_STATUSES = ['pending', 'shortlisted', 'discarded', 'invited', 'employee'];

const candidateSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    college: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    branch: { type: String, required: true, trim: true },
    degree: { type: String, required: true, trim: true },
    passingYear: { type: Number, required: true },
    message: { type: String, trim: true, maxlength: 2000 },
    // Keyed hash of the email; used in the resume-submission link.
    emailHash: { type: String, required: true, unique: true },
    status: { type: String, enum: CANDIDATE_STATUSES, default: 'pending', index: true },
    // Name of the admin who last changed the status.
    actionBy: String,
    statusHistory: [
      {
        _id: false,
        status: String,
        by: String,
        at: { type: Date, default: Date.now },
      },
    ],
    resumeLink: String,
    resumeSubmittedAt: Date,
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

module.exports = mongoose.model('Candidate', candidateSchema);
module.exports.CANDIDATE_STATUSES = CANDIDATE_STATUSES;
