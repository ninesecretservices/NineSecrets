import mongoose from 'mongoose';
import Review from '../schema/Review.js';
import Order from '../schema/Order.js';
import ApiError from '../utils/ApiError.js';

class ReviewController {
  // Public: reviews + average for a product
  async reviewList(req, res, next) {
    const { productId, page = 1, limit = 10 } = req.body;
    if (!productId) throw new ApiError(400, 'Product ID is required');

    const query = { product: productId, isDeleted: false };
    const total = await Review.countDocuments(query);
    const docs = await Review.find(query)
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const [agg] = await Review.aggregate([
      { $match: { product: new mongoose.Types.ObjectId(productId), isDeleted: false } },
      { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);

    res.locals.responseData = {
      success: true,
      data: {
        docs,
        total,
        page,
        limit,
        average: agg ? Math.round(agg.average * 10) / 10 : 0,
        count: agg?.count || 0
      },
    };
    next();
  }

  // Customer: create/update own review; only for products they purchased.
  async reviewCreate(req, res, next) {
    const { productId, rating, comment } = req.body;
    if (!productId) throw new ApiError(400, 'Product ID is required');
    const numRating = Number(rating);
    if (!numRating || numRating < 1 || numRating > 5) throw new ApiError(400, 'Rating must be between 1 and 5');

    const hasPurchased = await Order.exists({
      user: req.user.id,
      'items.product': productId,
      orderStatus: { $in: ['delivered', 'shipped', 'processing'] }
    });
    if (!hasPurchased) throw new ApiError(403, 'You can only review products you have purchased');

    const review = await Review.findOneAndUpdate(
      { product: productId, user: req.user.id },
      { rating: numRating, comment: (comment || '').trim(), isDeleted: false },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.locals.responseData = { success: true, message: 'Review saved', data: review };
    next();
  }

  // Public: a handful of the best recent reviews across all products, for the
  // homepage testimonials strip. Only reviews with a written comment qualify.
  async reviewFeatured(req, res, next) {
    const { limit = 6 } = req.body;
    const docs = await Review.find({ isDeleted: false, comment: { $exists: true, $ne: '' } })
      .populate('user', 'name')
      .populate('product', 'name slug')
      .sort({ rating: -1, createdAt: -1 })
      .limit(limit);
    res.locals.responseData = { success: true, data: docs };
    next();
  }

  // Public: store-wide aggregate rating (homepage social-proof strip).
  async reviewStats(req, res, next) {
    const [agg] = await Review.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    res.locals.responseData = {
      success: true,
      data: {
        average: agg ? Math.round(agg.average * 10) / 10 : 0,
        count: agg?.count || 0,
      },
    };
    next();
  }

  // Admin: remove a review
  async reviewDelete(req, res, next) {
    const { id } = req.body;
    if (!id) throw new ApiError(400, 'Review ID is required');
    const review = await Review.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
    if (!review) throw new ApiError(404, 'Review not found');
    res.locals.responseData = { success: true, message: 'Review deleted' };
    next();
  }
}

export default ReviewController;
