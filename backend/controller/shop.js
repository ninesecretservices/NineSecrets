import Shop from '../schema/Shop.js';
import ApiError from '../utils/ApiError.js';

class ShopController {
  // Both superadmin and sales can list — a rep needs to pick from shops
  // already added (by themselves or anyone else on the team) when starting
  // a new visit, not just ones they personally created.
  async shopList(req, res, next) {
    const { page = 1, limit = 50, search = '' } = req.body;
    const filter = { isActive: true };
    if (search) filter.name = { $regex: search, $options: 'i' };

    const total = await Shop.countDocuments(filter);
    const docs = await Shop.find(filter).sort({ name: 1 }).skip((page - 1) * limit).limit(limit);

    res.locals.responseData = { success: true, data: { docs, total, page, limit } };
    next();
  }

  // Sales reps add shops themselves, in the field, the first time they visit
  // one — not superadmin-only, unlike most other master data in this app.
  async shopCreate(req, res, next) {
    const { name, ownerName, phone, address, city } = req.body;
    if (!name?.trim()) throw new ApiError(400, 'Shop name is required');

    const shop = await Shop.create({ name: name.trim(), ownerName, phone, address, city, createdBy: req.user.id });
    res.locals.responseData = { success: true, message: 'Shop added', data: shop };
    next();
  }

  async shopUpdate(req, res, next) {
    const { id, ...data } = req.body;
    if (!id) throw new ApiError(400, 'Shop ID is required');

    const shop = await Shop.findByIdAndUpdate(id, data, { new: true });
    if (!shop) throw new ApiError(404, 'Shop not found');

    res.locals.responseData = { success: true, message: 'Shop updated', data: shop };
    next();
  }

  // Soft delete, same convention as the rest of the app — keeps past
  // BulkOrders pointing at a real (if hidden) shop record instead of a
  // dangling reference.
  async shopDelete(req, res, next) {
    const { id } = req.body;
    if (!id) throw new ApiError(400, 'Shop ID is required');

    const shop = await Shop.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!shop) throw new ApiError(404, 'Shop not found');

    res.locals.responseData = { success: true, message: 'Shop removed' };
    next();
  }
}

export default ShopController;
