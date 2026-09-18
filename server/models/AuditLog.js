const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actorId: String,
    actorRole: String,
    actorName: String,
    action: { type: String, required: true, index: true },
    target: String,
    meta: mongoose.Schema.Types.Mixed,
    ip: String,
  },
  { timestamps: { createdAt: true, updatedAt: false }, toJSON: { versionKey: false } }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
