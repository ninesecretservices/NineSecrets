import AuditLog from '../schema/AuditLog.js';

class AuditLogController {
  async auditLogList(req, res, next) {
    const { page = 1, limit = 50, entityType, action } = req.body;
    const query = {};
    if (entityType) query.entityType = entityType;
    if (action) query.action = action;

    const total = await AuditLog.countDocuments(query);
    const docs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.locals.responseData = { success: true, data: { docs, total, page, limit } };
    next();
  }
}

export default AuditLogController;
