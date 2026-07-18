import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  variant: {
    colour: { type: mongoose.Schema.Types.ObjectId, ref: 'Colour' },
    size: { type: mongoose.Schema.Types.ObjectId, ref: 'Size' },
    fit: { type: mongoose.Schema.Types.ObjectId, ref: 'Fit' },
    sku: { type: String }
  },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true }
});

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderNumber: { type: String, required: true, unique: true },
  items: [orderItemSchema],
  subtotal: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  shippingFee: { type: Number, default: 0 },
  total: { type: Number, required: true },
  shippingAddress: {
    fullName: { type: String },
    addressLine1: { type: String },
    addressLine2: { type: String },
    city: { type: String },
    state: { type: String },
    postalCode: { type: String },
    country: { type: String },
    phone: { type: String }
  },
  paymentStatus: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
  orderStatus: { type: String, enum: ['processing', 'shipped', 'delivered', 'cancelled'], default: 'processing' },
  paymentMethod: { type: String, enum: ['card', 'cod'], default: 'cod' },
  deliveredAt: { type: Date },
  coupon: {
    code: { type: String },
    discount: { type: Number, default: 0 }
  },
  returnRequest: {
    status: { type: String, enum: ['none', 'requested', 'approved', 'rejected', 'completed'], default: 'none' },
    type: { type: String, enum: ['return', 'exchange'] },
    reason: { type: String },
    requestedAt: { type: Date },
    resolvedAt: { type: Date }
  }
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);
