import Cart from '../schema/Cart.js';
import ApiError from '../utils/ApiError.js';

class CartController {
  async cartDetail(req, res, next) {
    const userId = req.user.id;
    let cart = await Cart.findOne({ user: userId })
      .populate('items.product', 'name slug thumbnail')
      .populate('items.variant.colour', 'name hexCode')
      .populate('items.variant.size', 'name')
      .populate('items.variant.fit', 'name');

    if (!cart) {
      cart = await Cart.create({ user: userId, items: [], total: 0 });
    }

    res.locals.responseData = { success: true, data: cart };
    next();
  }

  async cartUpdate(req, res, next) {
    const userId = req.user.id;
    const { items } = req.body; // Expecting full items array to replace or specific actions

    if (!Array.isArray(items)) {
      throw new ApiError(400, 'Items array is required');
    }

    let total = 0;
    items.forEach(item => {
      total += item.price * item.quantity;
    });

    const cart = await Cart.findOneAndUpdate(
      { user: userId },
      { items, total },
      { new: true, upsert: true }
    )
      .populate('items.product', 'name slug thumbnail')
      .populate('items.variant.colour', 'name hexCode')
      .populate('items.variant.size', 'name')
      .populate('items.variant.fit', 'name');

    res.locals.responseData = { success: true, message: 'Cart updated successfully', data: cart };
    next();
  }
}

export default CartController;
