const AuditLog = require('../models/AuditLog');
const { escapeRegex, toStr } = require('../utils/validators');

async function getAuditLogs(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 100);

    const filter = {};
    const action = toStr(req.query.action);
    if (action) filter.action = new RegExp(`^${escapeRegex(action)}`);

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      AuditLog.countDocuments(filter),
    ]);

    return res.status(200).json({
      logs,
      pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getAuditLogs };
