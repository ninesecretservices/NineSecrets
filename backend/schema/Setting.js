import mongoose from 'mongoose';

// Key/value store for storefront content and store configuration, managed from
// the admin panel. `value` is the PUBLISHED content the storefront serves;
// `draft` is the working copy; `versions` keeps the last published states for revert.
const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: mongoose.Schema.Types.Mixed, default: {} },
    draft: { type: mongoose.Schema.Types.Mixed, default: null },
    versions: [{
      content: { type: mongoose.Schema.Types.Mixed },
      publishedAt: { type: Date },
      publishedBy: { type: String }, // user name snapshot for display
    }],
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedByName: { type: String },
  },
  { timestamps: true, minimize: false }
);

export default mongoose.model('Setting', settingSchema);
