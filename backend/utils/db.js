import mongoose from 'mongoose';

// Side-effect imports: every schema file registers its model on import
// (mongoose.model(name, schema)). Some controllers now bypass Mongoose
// entirely (see methods.js — fetchData/executeData on raw collections), so
// nothing else would ever import these — but other Mongoose queries still
// .populate() these refs (e.g. Product -> Department/Item/Colour/Size/Fit),
// which requires the model to be registered even if never queried directly.
import '../schema/Department.js';
import '../schema/Item.js';
import '../schema/Design.js';
import '../schema/Colour.js';
import '../schema/Fabric.js';
import '../schema/Fit.js';
import '../schema/Size.js';
import '../schema/Coupon.js';
import '../schema/User.js';
import '../schema/Product.js';
import '../schema/Cart.js';
import '../schema/Order.js';
import '../schema/Review.js';
import '../schema/Setting.js';
import '../schema/AuditLog.js';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
