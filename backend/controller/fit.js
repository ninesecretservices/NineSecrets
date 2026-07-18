import ApiError from '../utils/ApiError.js';
import { fetchData, executeData } from '../methods.js';

const FIT_SCHEMA = {
  name: { required: true },
  status: { default: 'active', enum: ['active', 'inactive'] },
  isDeleted: { default: false },
};

class FitController {
  async fitList(req, res, next) {
    const { page = 1, limit = 10, search = '' } = req.body;
    const filter = { isDeleted: false };
    if (search) filter.name = { $regex: search, $options: 'i' };

    const { data } = await fetchData('fits', {}, filter, {
      sort: { createdAt: -1 },
      skip: (page - 1) * limit,
      limit,
    });
    const { count: total } = await fetchData('fits', { _id: 1 }, filter, { count: true });

    res.locals.responseData = { success: true, data: { docs: data, total, page, limit } };
    next();
  }

  async fitCreate(req, res, next) {
    const data = { ...req.body, createdBy: req.user.id };
    const { data: newDoc } = await executeData('fits', data, 'i', FIT_SCHEMA);

    res.locals.responseData = { success: true, message: 'Fit created successfully', data: newDoc };
    next();
  }

  async fitUpdate(req, res, next) {
    const { id, ...data } = req.body;
    if (!id) throw new ApiError(400, 'Fit ID is required');

    const result = await executeData('fits', { ...data, updatedBy: req.user.id }, 'u', FIT_SCHEMA, { _id: id });
    if (!result.success) throw new ApiError(404, 'Fit not found');

    res.locals.responseData = { success: true, message: 'Fit updated successfully', data: result.data };
    next();
  }

  async fitDelete(req, res, next) {
    const { id } = req.body;
    if (!id) throw new ApiError(400, 'Fit ID is required');

    const result = await executeData('fits', null, 'd', null, { _id: id }, { deletedBy: req.user.id });
    if (!result.success) throw new ApiError(404, 'Fit not found');

    res.locals.responseData = { success: true, message: 'Fit deleted successfully' };
    next();
  }

  async fitDetail(req, res, next) {
    const { id } = req.body;
    if (!id) throw new ApiError(400, 'Fit ID is required');

    const { data } = await fetchData('fits', {}, { _id: id, isDeleted: false });
    if (!data[0]) throw new ApiError(404, 'Fit not found');

    res.locals.responseData = { success: true, data: data[0] };
    next();
  }
}

export default FitController;
