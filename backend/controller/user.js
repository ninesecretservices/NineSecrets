import User from '../schema/User.js';
import ApiError from '../utils/ApiError.js';
import bcrypt from 'bcrypt';

class UserController {
  async userList(req, res, next) {
    const { page = 1, limit = 10, search = '' } = req.body;
    const query = {};
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    const total = await User.countDocuments(query);
    const data = await User.find(query)
      .select('-password')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });
      
    res.locals.responseData = { success: true, data: { docs: data, total, page, limit } };
    next();
  }

  async userCreate(req, res, next) {
    const { name, email, password, role } = req.body;
    
    const userExists = await User.findOne({ email });
    if (userExists) throw new ApiError(400, 'User already exists');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'admin'
    });

    res.locals.responseData = {
      success: true,
      message: 'User created successfully',
      data: { id: user._id, name: user.name, email: user.email, role: user.role },
    };
    next();
  }

  async userUpdate(req, res, next) {
    const { id, password, ...data } = req.body;
    if (!id) throw new ApiError(400, 'User ID is required');
    
    if (password) {
      const salt = await bcrypt.genSalt(10);
      data.password = await bcrypt.hash(password, salt);
    }
    
    const updatedUser = await User.findByIdAndUpdate(id, data, { new: true }).select('-password');
    if (!updatedUser) throw new ApiError(404, 'User not found');
    
    res.locals.responseData = { success: true, message: 'User updated successfully', data: updatedUser };
    next();
  }

  async userDelete(req, res, next) {
    const { id } = req.body;
    if (!id) throw new ApiError(400, 'User ID is required');
    
    // We'll soft deactivate users instead of hard delete, or hard delete based on preference.
    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) throw new ApiError(404, 'User not found');
    
    res.locals.responseData = { success: true, message: 'User deleted successfully' };
    next();
  }

  async userDetail(req, res, next) {
    const { id } = req.body;
    if (!id) throw new ApiError(400, 'User ID is required');
    
    const user = await User.findById(id).select('-password');
    if (!user) throw new ApiError(404, 'User not found');
    
    res.locals.responseData = { success: true, data: user };
    next();
  }
}

export default UserController;
