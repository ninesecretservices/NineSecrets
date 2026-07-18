import mongoose from 'mongoose';

const colourSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    hexCode: { type: String, trim: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('Colour', colourSchema);
