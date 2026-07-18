import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema({
  colour: { type: mongoose.Schema.Types.ObjectId, ref: 'Colour', required: true },
  size: { type: mongoose.Schema.Types.ObjectId, ref: 'Size', required: true },
  fit: { type: mongoose.Schema.Types.ObjectId, ref: 'Fit', required: true },
  sku: { type: String, required: true, trim: true },
  barcode: { type: String, trim: true }, // physical barcode (e.g. Alpha-E) — sync key for stock imports
  stock: { type: Number, required: true, default: 0 },
  mrp: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  discountPrice: { type: Number },
});

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    description: { type: String },
    
    // Master data references
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    design: { type: mongoose.Schema.Types.ObjectId, ref: 'Design' },
    fabric: { type: mongoose.Schema.Types.ObjectId, ref: 'Fabric' },
    
    // Embedded Variants
    variants: [variantSchema],

    // Media
    thumbnail: { type: String },
    images: [{ type: String }],
    
    // SEO & Meta
    metaTitle: { type: String },
    metaDescription: { type: String },
    hsnCode: { type: String },
    taxPercentage: { type: Number, default: 0 },
    
    // Status & Flags
    status: { type: String, enum: ['active', 'draft', 'out-of-stock'], default: 'draft' },
    isFeatured: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('Product', productSchema);
