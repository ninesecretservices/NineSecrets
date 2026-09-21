import mongoose from 'mongoose';

// Generic append-only trail for admin-panel mutations — who did what, to which
// record, and (where useful) what changed. Deliberately schema-loose (Mixed
// before/after) since it spans products, orders, coupons, settings, and users
// rather than one entity type.
const auditLogSchema = new mongoose.Schema({
  actor: {
    // id is optional — some entries (e.g. a failed automatic refund) are
    // system-triggered rather than caused by a logged-in user's request.
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String },
    email: { type: String },
    role: { type: String }
  },
  action: { type: String, required: true }, // e.g. 'product.update', 'order.status_update'
  entityType: { type: String, required: true }, // 'Product' | 'Order' | 'Coupon' | 'Setting' | 'User' | 'Stock'
  entityId: { type: mongoose.Schema.Types.ObjectId },
  summary: { type: String, required: true },
  before: { type: mongoose.Schema.Types.Mixed },
  after: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

auditLogSchema.index({ createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
