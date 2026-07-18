import ApiError from '../utils/ApiError.js';
import { fetchData, executeData } from '../methods.js';

const SIZE_SCHEMA = {
  name: { required: true },
  status: { default: 'active', enum: ['active', 'inactive'] },
  isDeleted: { default: false },
};

class SizeController {
  async sizeList(req, res, next) {
    const { page = 1, limit = 10, search = '' } = req.body;
    const filter = { isDeleted: false };
    if (search) filter.name = { $regex: search, $options: 'i' };

    const { data } = await fetchData('sizes', {}, filter, {
      sort: { createdAt: -1 },
      skip: (page - 1) * limit,
      limit,
    });
    const { count: total } = await fetchData('sizes', { _id: 1 }, filter, { count: true });

    res.locals.responseData = { success: true, data: { docs: data, total, page, limit } };
    next();
  }

  async sizeCreate(req, res, next) {
    const data = { ...req.body, createdBy: req.user.id };
    const { data: newDoc } = await executeData('sizes', data, 'i', SIZE_SCHEMA);

    res.locals.responseData = { success: true, message: 'Size created successfully', data: newDoc };
    next();
  }

  async sizeUpdate(req, res, next) {
    const { id, ...data } = req.body;
    if (!id) throw new ApiError(400, 'Size ID is required');

    const result = await executeData('sizes', { ...data, updatedBy: req.user.id }, 'u', SIZE_SCHEMA, { _id: id });
    if (!result.success) throw new ApiError(404, 'Size not found');

    res.locals.responseData = { success: true, message: 'Size updated successfully', data: result.data };
    next();
  }

  async sizeDelete(req, res, next) {
    const { id } = req.body;
    if (!id) throw new ApiError(400, 'Size ID is required');

    const result = await executeData('sizes', null, 'd', null, { _id: id }, { deletedBy: req.user.id });
    if (!result.success) throw new ApiError(404, 'Size not found');

    res.locals.responseData = { success: true, message: 'Size deleted successfully' };
    next();
  }

  async sizeDetail(req, res, next) {
    const { id } = req.body;
    if (!id) throw new ApiError(400, 'Size ID is required');

    const { data } = await fetchData('sizes', {}, { _id: id, isDeleted: false });
    if (!data[0]) throw new ApiError(404, 'Size not found');

    res.locals.responseData = { success: true, data: data[0] };
    next();
  }
}

export default SizeController;
