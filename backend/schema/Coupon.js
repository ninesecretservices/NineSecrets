import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ['percent', 'fixed'], required: true },
    value: { type: Number, required: true, min: 0 },
    minOrderValue: { type: Number, default: 0 },
    maxDiscount: { type: Number }, // cap for percent coupons
    // Empty/unset = applies cart-wide (backward compatible with every coupon
    // created before this field existed). Non-empty = discount only applies
    // to the subtotal of matching products; minOrderValue still checks the
    // FULL cart though — "spend ₹999 total, get 20% off Lounge Sets" is the
    // common real-world shape, not "spend ₹999 of Lounge Sets".
    scope: {
      products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    },
    // Coupon isn't valid before this (flash-sale style scheduling); expiresAt
    // already covers the end of the window.
    startsAt: { type: Date },
    expiresAt: { type: Date },
    usageLimit: { type: Number }, // total redemptions allowed
    usedCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Coupon', couponSchema);
