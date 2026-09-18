const AuditLog = require('../models/AuditLog');

/**
 * Record an audit entry. Never throws: auditing must not break the request.
 */
async function logAudit(req, action, { target, meta, actor } = {}) {
  try {
    const who = actor || req.account;
    await AuditLog.create({
      actorId: who?._id ? String(who._id) : req.user?.id,
      actorRole: who?.role || req.user?.role || (who ? 'employee' : 'public'),
      actorName: who ? `${who.firstName} ${who.lastName}` : undefined,
      action,
      target: target ? String(target) : undefined,
      meta,
      ip: req.ip,
    });
  } catch (error) {
    console.error('[audit] failed to record', action, error.message);
  }
}

module.exports = { logAudit };
