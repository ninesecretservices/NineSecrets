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
  total: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('Cart', cartSchema);
