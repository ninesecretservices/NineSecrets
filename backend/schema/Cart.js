import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  variant: {
    colour: { type: mongoose.Schema.Types.ObjectId, ref: 'Colour', required: true },
    size: { type: mongoose.Schema.Types.ObjectId, ref: 'Size', required: true },
    fit: { type: mongoose.Schema.Types.ObjectId, ref: 'Fit', required: true },
    sku: { type: String, required: true }
  },
  quantity: { type: Number, required: true, default: 1, min: 1 },
  price: { type: Number, required: true }
});

const cartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items: [cartItemSchema],
  total: { type: Number, default: 0 },
  // Set when an abandoned-cart reminder email is sent for the cart's current
  // contents (see jobs/abandonedCart.js). Compared against `updatedAt` rather
  // than cleared on every cart edit — cheaper, and self-resetting: once the
  // cart changes again, updatedAt moves past this timestamp and the cart
  // becomes eligible for a fresh reminder on its own.
  abandonedEmailSentAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model('Cart', cartSchema);
