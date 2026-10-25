import mongoose from 'mongoose';

// A retail shop the wholesale sales team visits and sells bulk stock to —
// not a vendor/supplier. Added manually (by a sales rep in the field, or by
// an admin) the first time a sales rep visits; purely for attributing bulk
// orders to "which shop, which area."
const shopSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    ownerName: { type: String, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('Shop', shopSchema);
