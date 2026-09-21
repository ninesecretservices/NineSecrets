import User from '../schema/User.js';
import ApiError from '../utils/ApiError.js';
import { logAudit } from '../utils/auditLog.js';

class CustomerController {
  // Customer-facing accounts only — staff accounts have their own page (Users).
  // LTV/order count are computed live from Orders rather than cached on the
  // User document, so they're always accurate and need no separate upkeep.
  async customerList(req, res, next) {
    const { page = 1, limit = 20, search = '' } = req.body;
    const match = { role: 'customer' };
    if (search) {
      match.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: 'orders',
          let: { uid: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$user', '$$uid'] }, { $ne: ['$orderStatus', 'cancelled'] }] } } },
          ],
          as: 'orders',
        },
      },
      {
        $addFields: {
          orderCount: { $size: '$orders' },
          ltv: { $sum: '$orders.total' },
          lastOrderAt: { $max: '$orders.createdAt' },
        },
      },
      { $project: { password: 0, orders: 0, resetPasswordToken: 0, resetPasswordExpires: 0 } },
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ];

    const docs = await User.aggregate(pipeline);
    const total = await User.countDocuments(match);

    res.locals.responseData = { success: true, data: { docs, total, page, limit } };
    next();
  }

  async customerUpdate(req, res, next) {
    const { id, notes, tags, isActive } = req.body;
    if (!id) throw new ApiError(400, 'Customer ID is required');

    const patch = {};
    if (notes !== undefined) patch.notes = notes;
    if (Array.isArray(tags)) patch.tags = tags;
    if (isActive !== undefined) patch.isActive = isActive;

    const before = await User.findOne({ _id: id, role: 'customer' }, 'isActive');
    if (!before) throw new ApiError(404, 'Customer not found');

    const updated = await User.findByIdAndUpdate(id, patch, { new: true }).select('-password -resetPasswordToken -resetPasswordExpires');

    logAudit({
      actor: req.user, action: 'customer.update', entityType: 'User', entityId: id,
      summary: `Updated customer "${updated.email}"${before.isActive !== updated.isActive ? ` — ${updated.isActive ? 'unblocked' : 'blocked'}` : ''}`,
      before: { isActive: before.isActive }, after: patch,
    });

    res.locals.responseData = { success: true, message: 'Customer updated', data: updated };
    next();
  }
}

export default CustomerController;
