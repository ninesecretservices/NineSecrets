import mongoose from 'mongoose';

// Mirrors Order's line-item shape so the two stay easy to reason about
// together, even though they're unrelated collections.
const bulkOrderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  variant: {
    colour: { type: mongoose.Schema.Types.ObjectId, ref: 'Colour' },
    size: { type: mongoose.Schema.Types.ObjectId, ref: 'Size' },
    fit: { type: mongoose.Schema.Types.ObjectId, ref: 'Fit' },
    sku: { type: String },
  },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true }, // wholesalePrice at the time this line was added
});

// A bulk wholesale order a sales rep took from a shop, in person, via the
// tablet app. Finalizing one decrements real stock immediately (same
// Product.variants.stock pool the public storefront sells from) — see
// finalizeBulkOrder in controller/bulkOrder.js.
const bulkOrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
    salesPerson: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [bulkOrderItemSchema],
    totalPieces: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ['sent', 'received', 'cancelled'], default: 'sent' },
  },
  { timestamps: true }
);

export default mongoose.model('BulkOrder', bulkOrderSchema);
