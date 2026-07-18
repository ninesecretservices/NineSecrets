import mongoose from 'mongoose';

const designSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g. Design No.
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('Design', designSchema);
