import AuditLog from '../schema/AuditLog.js';

// Fire-and-forget, same spirit as logError in methods.js — an audit-log write
// failing must never break the actual mutation it's describing.
export async function logAudit({ actor, action, entityType, entityId, summary, before, after }) {
  try {
    await AuditLog.create({
      actor: { id: actor.id, name: actor.name, email: actor.email, role: actor.role },
      action,
      entityType,
      entityId,
      summary,
      before,
      after,
    });
  } catch (err) {
    console.error('Audit log write failed:', err.message);
  }
}
