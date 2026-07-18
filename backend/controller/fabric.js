import ApiError from '../utils/ApiError.js';
import { fetchData, executeData } from '../methods.js';

const FABRIC_SCHEMA = {
  name: { required: true },
  status: { default: 'active', enum: ['active', 'inactive'] },
  isDeleted: { default: false },
};

class FabricController {
  async fabricList(req, res, next) {
    const { page = 1, limit = 10, search = '' } = req.body;
    const filter = { isDeleted: false };
    if (search) filter.name = { $regex: search, $options: 'i' };

    const { data } = await fetchData('fabrics', {}, filter, {
      sort: { createdAt: -1 },
      skip: (page - 1) * limit,
      limit,
    });
    const { count: total } = await fetchData('fabrics', { _id: 1 }, filter, { count: true });

    res.locals.responseData = { success: true, data: { docs: data, total, page, limit } };
    next();
  }

  async fabricCreate(req, res, next) {
    const data = { ...req.body, createdBy: req.user.id };
    const { data: newDoc } = await executeData('fabrics', data, 'i', FABRIC_SCHEMA);

    res.locals.responseData = { success: true, message: 'Fabric created successfully', data: newDoc };
    next();
  }

  async fabricUpdate(req, res, next) {
    const { id, ...data } = req.body;
    if (!id) throw new ApiError(400, 'Fabric ID is required');

    const result = await executeData('fabrics', { ...data, updatedBy: req.user.id }, 'u', FABRIC_SCHEMA, { _id: id });
    if (!result.success) throw new ApiError(404, 'Fabric not found');

    res.locals.responseData = { success: true, message: 'Fabric updated successfully', data: result.data };
    next();
  }

  async fabricDelete(req, res, next) {
    const { id } = req.body;
    if (!id) throw new ApiError(400, 'Fabric ID is required');

    const result = await executeData('fabrics', null, 'd', null, { _id: id }, { deletedBy: req.user.id });
    if (!result.success) throw new ApiError(404, 'Fabric not found');

    res.locals.responseData = { success: true, message: 'Fabric deleted successfully' };
    next();
  }

  async fabricDetail(req, res, next) {
    const { id } = req.body;
    if (!id) throw new ApiError(400, 'Fabric ID is required');

    const { data } = await fetchData('fabrics', {}, { _id: id, isDeleted: false });
    if (!data[0]) throw new ApiError(404, 'Fabric not found');

    res.locals.responseData = { success: true, data: data[0] };
    next();
  }
}

export default FabricController;
