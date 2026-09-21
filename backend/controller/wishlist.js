import User from '../schema/User.js';
import ApiError from '../utils/ApiError.js';

class WishlistController {
  async wishlistList(req, res, next) {
    const user = await User.findById(req.user.id).populate({
      path: 'wishlist',
      match: { isDeleted: false },
      select: 'name slug thumbnail isFeatured mrp sellingPrice variants',
    });
    res.locals.responseData = { success: true, data: user?.wishlist || [] };
    next();
  }

  async wishlistToggle(req, res, next) {
    const { productId } = req.body;
    if (!productId) throw new ApiError(400, 'Product ID is required');

    const user = await User.findById(req.user.id);
    if (!user) throw new ApiError(404, 'User not found');

    const exists = user.wishlist.some((id) => id.toString() === productId);
    user.wishlist = exists
      ? user.wishlist.filter((id) => id.toString() !== productId)
      : [...user.wishlist, productId];
    await user.save();

    res.locals.responseData = { success: true, data: { added: !exists } };
    next();
  }

  // Merges a guest's locally-saved wishlist into the server copy right after
  // login — same idea as syncGuestCartToServer on the cart side.
  async wishlistMerge(req, res, next) {
    const { productIds } = req.body;
    if (!Array.isArray(productIds)) throw new ApiError(400, 'productIds must be an array');

    const user = await User.findById(req.user.id);
    if (!user) throw new ApiError(404, 'User not found');

    const merged = new Set(user.wishlist.map((id) => id.toString()));
    for (const id of productIds) merged.add(String(id));
    user.wishlist = Array.from(merged);
    await user.save();

    res.locals.responseData = { success: true, message: 'Wishlist merged' };
    next();
  }
}

export default WishlistController;
