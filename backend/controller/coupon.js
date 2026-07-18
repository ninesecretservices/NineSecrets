import ApiError from '../utils/ApiError.js';
import { fetchData, executeData } from '../methods.js';
import { validateCoupon } from './order.js';

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
    const { code, type, value, minOrderValue, maxDiscount, expiresAt, usageLimit, isActive } = req.body;
    if (!code || !type || value == null) throw new ApiError(400, 'Code, type and value are required');
    if (!['percent', 'fixed'].includes(type)) throw new ApiError(400, 'Type must be percent or fixed');
    if (type === 'percent' && (value <= 0 || value > 100)) throw new ApiError(400, 'Percent value must be 1-100');

    const upperCode = code.toUpperCase();
    const { data: existing } = await fetchData('coupons', {}, { code: upperCode });
    if (existing[0]) throw new ApiError(400, 'Coupon code already exists');

    const { data: doc } = await executeData(
      'coupons',
      { code: upperCode, type, value, minOrderValue, maxDiscount, expiresAt, usageLimit, isActive },
      'i',
      COUPON_SCHEMA
    );

    res.locals.responseData = { success: true, message: 'Coupon created successfully', data: doc };
    next();
  }

  async couponUpdate(req, res, next) {
    const { id, ...data } = req.body;
    if (!id) throw new ApiError(400, 'Coupon ID is required');
    if (data.code) data.code = data.code.toUpperCase();

    const result = await executeData('coupons', data, 'u', COUPON_SCHEMA, { _id: id });
    if (!result.success) throw new ApiError(404, 'Coupon not found');

    res.locals.responseData = { success: true, message: 'Coupon updated successfully', data: result.data };
    next();
  }

  async couponDelete(req, res, next) {
    const { id } = req.body;
    if (!id) throw new ApiError(400, 'Coupon ID is required');

    const result = await executeData('coupons', { isDeleted: true, isActive: false }, 'u', null, { _id: id });
    if (!result.success) throw new ApiError(404, 'Coupon not found');

    res.locals.responseData = { success: true, message: 'Coupon deleted successfully' };
    next();
  }

  // Customer: check a coupon against their cart subtotal before checkout.
  async couponApply(req, res, next) {
    const { code, subtotal } = req.body;
    if (!code) throw new ApiError(400, 'Coupon code is required');
    const { coupon, discount } = await validateCoupon(code, Number(subtotal) || 0);

    res.locals.responseData = {
      success: true,
      message: 'Coupon applied',
      data: { code: coupon.code, type: coupon.type, value: coupon.value, discount },
    };
    next();
  }
}

export default CouponController;
