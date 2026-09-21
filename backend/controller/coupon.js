import mongoose from 'mongoose';
import ApiError from '../utils/ApiError.js';
import { fetchData, executeData } from '../methods.js';
import { validateCoupon } from './order.js';
import { logAudit } from '../utils/auditLog.js';
import Cart from '../schema/Cart.js';

// Coupons are managed via the raw-collection fetchData/executeData path (see
// methods.js), which bypasses Mongoose's own ObjectId casting — so a
// ref-array field like scope.products needs casting by hand here, or it
// would be stored as plain strings instead of real ObjectIds.
const castScope = (scope) => {
  if (!scope?.products) return scope;
  return { products: scope.products.filter(mongoose.Types.ObjectId.isValid).map((id) => new mongoose.Types.ObjectId(id)) };
};

const COUPON_SCHEMA = {
  minOrderValue: { default: 0 },
  usedCount: { default: 0 },
  isActive: { default: true },
  isDeleted: { default: false },
};

class CouponController {
  async couponList(req, res, next) {
    const { page = 1, limit = 100, search = '' } = req.body;
    const filter = { isDeleted: false };
    if (search) filter.code = { $regex: search, $options: 'i' };

    const { data } = await fetchData('coupons', {}, filter, {
      sort: { createdAt: -1 },
      skip: (page - 1) * limit,
      limit,
    });
    const { count: total } = await fetchData('coupons', { _id: 1 }, filter, { count: true });

    res.locals.responseData = { success: true, data: { docs: data, total, page, limit } };
    next();
  }

  async couponCreate(req, res, next) {
    const { code, type, value, minOrderValue, maxDiscount, expiresAt, startsAt, usageLimit, isActive, scope } = req.body;
    if (!code || !type || value == null) throw new ApiError(400, 'Code, type and value are required');
    if (!['percent', 'fixed'].includes(type)) throw new ApiError(400, 'Type must be percent or fixed');
    if (type === 'percent' && (value <= 0 || value > 100)) throw new ApiError(400, 'Percent value must be 1-100');

    const upperCode = code.toUpperCase();
    const { data: existing } = await fetchData('coupons', {}, { code: upperCode });
    if (existing[0]) throw new ApiError(400, 'Coupon code already exists');

    const { data: doc } = await executeData(
      'coupons',
      { code: upperCode, type, value, minOrderValue, maxDiscount, expiresAt, startsAt, usageLimit, isActive, scope: castScope(scope) },
      'i',
      COUPON_SCHEMA
    );

    logAudit({ actor: req.user, action: 'coupon.create', entityType: 'Coupon', entityId: doc._id, summary: `Created coupon "${upperCode}"`, after: doc });

    res.locals.responseData = { success: true, message: 'Coupon created successfully', data: doc };
    next();
  }

  async couponUpdate(req, res, next) {
    const { id, ...data } = req.body;
    if (!id) throw new ApiError(400, 'Coupon ID is required');
    if (data.code) data.code = data.code.toUpperCase();
    if (data.scope) data.scope = castScope(data.scope);

    const before = (await fetchData('coupons', {}, { _id: id })).data[0];
    const result = await executeData('coupons', data, 'u', COUPON_SCHEMA, { _id: id });
    if (!result.success) throw new ApiError(404, 'Coupon not found');

    logAudit({ actor: req.user, action: 'coupon.update', entityType: 'Coupon', entityId: id, summary: `Updated coupon "${result.data.code}"`, before, after: result.data });

    res.locals.responseData = { success: true, message: 'Coupon updated successfully', data: result.data };
    next();
  }

  async couponDelete(req, res, next) {
    const { id } = req.body;
    if (!id) throw new ApiError(400, 'Coupon ID is required');

    const result = await executeData('coupons', { isDeleted: true, isActive: false }, 'u', null, { _id: id });
    if (!result.success) throw new ApiError(404, 'Coupon not found');

    logAudit({ actor: req.user, action: 'coupon.delete', entityType: 'Coupon', entityId: id, summary: `Deleted coupon "${result.data.code}"` });

    res.locals.responseData = { success: true, message: 'Coupon deleted successfully' };
    next();
  }

  // Customer: preview a coupon against their real server-side cart, so a
  // scoped coupon's discount matches exactly what checkout will actually
  // apply (checkout re-validates independently, but a mismatched preview
  // would just be a confusing bait-and-switch at the final step).
  async couponApply(req, res, next) {
    const { code } = req.body;
    if (!code) throw new ApiError(400, 'Coupon code is required');
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart || cart.items.length === 0) throw new ApiError(400, 'Your cart is empty');
    const { coupon, discount } = await validateCoupon(code, cart.items);

    res.locals.responseData = {
      success: true,
      message: 'Coupon applied',
      data: { code: coupon.code, type: coupon.type, value: coupon.value, discount },
    };
    next();
  }
}

export default CouponController;
