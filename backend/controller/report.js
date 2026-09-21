import Order from '../schema/Order.js';

class ReportController {
  // Sales broken down by product, and rolled up by department (category).
  // Excludes cancelled orders; optional from/to (ISO date strings) narrows
  // the window — omitted, it's all-time.
  async reportSales(req, res, next) {
    const { from, to } = req.body;
    const match = { orderStatus: { $ne: 'cancelled' } };
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to) match.createdAt.$lte = new Date(to);
    }

    const byProduct = await Order.aggregate([
      { $match: match },
      { $unwind: '$items' },
      { $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
      } },
      { $sort: { revenue: -1 } },
      { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'departments', localField: 'product.department', foreignField: '_id', as: 'department' } },
      { $unwind: { path: '$department', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 1, name: 1, quantity: 1, revenue: 1, department: { $ifNull: ['$department.name', 'Uncategorized'] } } },
    ]);

    const byCategory = new Map();
    for (const row of byProduct) {
      const key = row.department;
      const existing = byCategory.get(key) || { department: key, quantity: 0, revenue: 0 };
      existing.quantity += row.quantity;
      existing.revenue += row.revenue;
      byCategory.set(key, existing);
    }

    res.locals.responseData = {
      success: true,
      data: {
        byProduct,
        byCategory: [...byCategory.values()].sort((a, b) => b.revenue - a.revenue),
      },
    };
    next();
  }

  // Return rate per product: how many orders containing that product ended
  // up with a return/exchange request, out of how many orders contained it.
  async reportReturns(req, res, next) {
    const ordersByProduct = await Order.aggregate([
      { $match: { orderStatus: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.product', name: { $first: '$items.name' }, orderCount: { $sum: 1 } } },
    ]);

    const returnsByProduct = await Order.aggregate([
      { $match: { 'returnRequest.status': { $nin: ['none', null] } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.product', returnCount: { $sum: 1 } } },
    ]);
    const returnCountById = new Map(returnsByProduct.map((r) => [String(r._id), r.returnCount]));

    const rows = ordersByProduct
      .map((p) => {
        const returnCount = returnCountById.get(String(p._id)) || 0;
        return {
          _id: p._id,
          name: p.name,
          orderCount: p.orderCount,
          returnCount,
          returnRate: p.orderCount > 0 ? Math.round((returnCount / p.orderCount) * 1000) / 10 : 0,
        };
      })
      .filter((p) => p.returnCount > 0)
      .sort((a, b) => b.returnRate - a.returnRate);

    res.locals.responseData = { success: true, data: rows };
    next();
  }
}

export default ReportController;
