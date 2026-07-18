import crypto from 'crypto';
import User from '../schema/User.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import ApiError from '../utils/ApiError.js';
import { sendEmail, passwordResetEmail } from '../utils/email.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const signTokens = (user) => ({
  accessToken: jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN }
  ),
  refreshToken: jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }
  ),
});

class AuthController {
  async login(req, res, next) {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ApiError(400, 'Please provide email and password');
    }

    const user = await User.findOne({ email });
    if (!user || !user.isActive) {
      throw new ApiError(401, 'Invalid credentials or inactive account');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new ApiError(401, 'Invalid credentials');
    }

    const { accessToken, refreshToken } = signTokens(user);

    res.locals.responseData = {
      success: true,
      data: {
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
        accessToken,
        refreshToken
      },
    };
    next();
  }

  // Public signup — always creates a CUSTOMER. Admin accounts are created only
  // by a superadmin via /user/create.
  async signup(req, res, next) {
    const { name, email, password } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      throw new ApiError(400, 'Name must be at least 2 characters');
    }
    if (!email || !EMAIL_RE.test(email)) {
      throw new ApiError(400, 'A valid email is required');
    }
    if (!password || password.length < 6) {
      throw new ApiError(400, 'Password must be at least 6 characters');
    }

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      throw new ApiError(400, 'An account with this email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'customer'
    });

    const { accessToken, refreshToken } = signTokens(user);

    res.locals.responseData = {
      success: true,
      message: 'Account created successfully',
      data: {
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
        accessToken,
        refreshToken
      },
    };
    next();
  }

  async refreshToken(req, res, next) {
    const { token } = req.body;
    if (!token) throw new ApiError(401, 'No refresh token provided');

    try {
      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) throw new ApiError(401, 'User not found or inactive');

      const accessToken = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN }
      );

      res.locals.responseData = { success: true, data: { accessToken } };
      next();
    } catch (err) {
      throw new ApiError(401, 'Invalid refresh token');
    }
  }

  async forgotPassword(req, res, next) {
    const { email } = req.body;
    if (!email) throw new ApiError(400, 'Email is required');

    const user = await User.findOne({ email: email.toLowerCase() });
    // Always respond success so the endpoint can't be used to probe registered emails.
    if (user && user.isActive) {
      const token = crypto.randomBytes(32).toString('hex');
      user.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
      user.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000);
      await user.save();

      const base = process.env.FRONTEND_URL || 'http://localhost:5173';
      const resetUrl = `${base}/reset-password?token=${token}`;
      await sendEmail({ to: user.email, ...passwordResetEmail(resetUrl) });
    }

    res.locals.responseData = { success: true, message: 'If that email is registered, a reset link has been sent' };
    next();
  }

  async resetPassword(req, res, next) {
    const { token, password } = req.body;
    if (!token) throw new ApiError(400, 'Reset token is required');
    if (!password || password.length < 6) {
      throw new ApiError(400, 'Password must be at least 6 characters');
    }

    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashed,
      resetPasswordExpires: { $gt: new Date() }
    });
    if (!user) throw new ApiError(400, 'Reset link is invalid or has expired');

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.locals.responseData = { success: true, message: 'Password has been reset. You can now sign in.' };
    next();
  }

  // Current user's profile incl. saved addresses.
  async profile(req, res, next) {
    const user = await User.findById(req.user.id).select('name email role addresses createdAt');
    res.locals.responseData = { success: true, data: user };
    next();
  }

  // Self-service update: name, saved addresses, and password (requires current password).
  async profileUpdate(req, res, next) {
    const { name, addresses, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) throw new ApiError(404, 'User not found');

    if (name !== undefined) {
      if (!name || name.trim().length < 2) throw new ApiError(400, 'Name must be at least 2 characters');
      user.name = name.trim();
    }
    if (addresses !== undefined) {
      if (!Array.isArray(addresses) || addresses.length > 10) throw new ApiError(400, 'Invalid addresses');
      user.addresses = addresses;
    }
    if (newPassword) {
      if (!currentPassword) throw new ApiError(400, 'Current password is required to set a new one');
      const ok = await bcrypt.compare(currentPassword, user.password);
      if (!ok) throw new ApiError(401, 'Current password is incorrect');
      if (newPassword.length < 6) throw new ApiError(400, 'New password must be at least 6 characters');
      user.password = await bcrypt.hash(newPassword, await bcrypt.genSalt(10));
    }
    await user.save();

    res.locals.responseData = {
      success: true,
      message: 'Profile updated',
      data: { id: user._id, name: user.name, email: user.email, role: user.role, addresses: user.addresses },
    };
    next();
  }

  async logout(req, res, next) {
    // For JWT without Redis, logout is mostly handled client-side by clearing tokens.
    res.locals.responseData = { success: true, message: 'Logged out successfully' };
    next();
  }
}

export default AuthController;
