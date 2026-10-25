import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      // fulfillment: orders-only staff access. catalog: products/master-data-only
      // staff access. Neither can delete records or reach Users/Coupons/Settings/
      // Homepage — same restriction 'admin' itself already has for deletes.
      // sales: the wholesale tablet app only — build/finalize bulk orders and
      // add shops, no access to the web admin panel's customer-facing side.
      enum: ['superadmin', 'admin', 'fulfillment', 'catalog', 'sales', 'customer'],
      default: 'customer',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    // Admin-only, customer-facing accounts only — internal notes/labels, never
    // shown to the customer themselves.
    notes: { type: String },
    tags: [{ type: String }],
    addresses: [{
      label: { type: String, default: 'Home' },
      fullName: { type: String, required: true },
      addressLine1: { type: String, required: true },
      addressLine2: { type: String },
      city: { type: String, required: true },
      state: { type: String },
      postalCode: { type: String, required: true },
      phone: { type: String, required: true },
    }],
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
