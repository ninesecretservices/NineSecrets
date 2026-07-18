import ApiError from '../utils/ApiError.js';
import { fetchData, executeData } from '../methods.js';

const DESIGN_SCHEMA = {
  name: { required: true },
  status: { default: 'active', enum: ['active', 'inactive'] },
  isDeleted: { default: false },
};

class DesignController {
  async designList(req, res, next) {
    const { page = 1, limit = 10, search = '' } = req.body;
    const filter = { isDeleted: false };
    if (search) filter.name = { $regex: search, $options: 'i' };

    const { data } = await fetchData('designs', {}, filter, {
      sort: { createdAt: -1 },
      skip: (page - 1) * limit,
      limit,
    });
    const { count: total } = await fetchData('designs', { _id: 1 }, filter, { count: true });

    res.locals.responseData = { success: true, data: { docs: data, total, page, limit } };
    next();
  }

  async designCreate(req, res, next) {
    const data = { ...req.body, createdBy: req.user.id };
    const { data: newDoc } = await executeData('designs', data, 'i', DESIGN_SCHEMA);

    res.locals.responseData = { success: true, message: 'Design created successfully', data: newDoc };
    next();
  }

  async designUpdate(req, res, next) {
    const { id, ...data } = req.body;
    if (!id) throw new ApiError(400, 'Design ID is required');

    const result = await executeData('designs', { ...data, updatedBy: req.user.id }, 'u', DESIGN_SCHEMA, { _id: id });
    if (!result.success) throw new ApiError(404, 'Design not found');

    res.locals.responseData = { success: true, message: 'Design updated successfully', data: result.data };
    next();
  }

  async designDelete(req, res, next) {
    const { id } = req.body;
    if (!id) throw new ApiError(400, 'Design ID is required');

    const result = await executeData('designs', null, 'd', null, { _id: id }, { deletedBy: req.user.id });
    if (!result.success) throw new ApiError(404, 'Design not found');

    res.locals.responseData = { success: true, message: 'Design deleted successfully' };
    next();
  }

  async designDetail(req, res, next) {
    const { id } = req.body;
    if (!id) throw new ApiError(400, 'Design ID is required');

    const { data } = await fetchData('designs', {}, { _id: id, isDeleted: false });
    if (!data[0]) throw new ApiError(404, 'Design not found');

    res.locals.responseData = { success: true, data: data[0] };
    next();
  }
}

export default DesignController;
