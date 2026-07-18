import ApiError from '../utils/ApiError.js';
import { fetchData, executeData } from '../methods.js';

const DEPARTMENT_SCHEMA = {
  name: { required: true },
  status: { default: 'active', enum: ['active', 'inactive'] },
  isDeleted: { default: false },
};

class DepartmentController {
  async departmentList(req, res, next) {
    const { page = 1, limit = 10, search = '' } = req.body;
    const filter = { isDeleted: false };
    if (search) filter.name = { $regex: search, $options: 'i' };

    const { data } = await fetchData('departments', {}, filter, {
      sort: { createdAt: -1 },
      skip: (page - 1) * limit,
      limit,
    });
    const { count: total } = await fetchData('departments', { _id: 1 }, filter, { count: true });

    res.locals.responseData = { success: true, data: { docs: data, total, page, limit } };
    next();
  }

  async departmentCreate(req, res, next) {
    const data = { ...req.body, createdBy: req.user.id };
    const { data: newDoc } = await executeData('departments', data, 'i', DEPARTMENT_SCHEMA);

    res.locals.responseData = { success: true, message: 'Department created successfully', data: newDoc };
    next();
  }

  async departmentUpdate(req, res, next) {
    const { id, ...data } = req.body;
    if (!id) throw new ApiError(400, 'Department ID is required');

    const result = await executeData('departments', { ...data, updatedBy: req.user.id }, 'u', DEPARTMENT_SCHEMA, { _id: id });
    if (!result.success) throw new ApiError(404, 'Department not found');

    res.locals.responseData = { success: true, message: 'Department updated successfully', data: result.data };
    next();
  }

  async departmentDelete(req, res, next) {
    const { id } = req.body;
    if (!id) throw new ApiError(400, 'Department ID is required');

    const result = await executeData('departments', null, 'd', null, { _id: id }, { deletedBy: req.user.id });
    if (!result.success) throw new ApiError(404, 'Department not found');

    res.locals.responseData = { success: true, message: 'Department deleted successfully' };
    next();
  }

  async departmentDetail(req, res, next) {
    const { id } = req.body;
    if (!id) throw new ApiError(400, 'Department ID is required');

    const { data } = await fetchData('departments', {}, { _id: id, isDeleted: false });
    if (!data[0]) throw new ApiError(404, 'Department not found');

    res.locals.responseData = { success: true, data: data[0] };
    next();
  }
}

export default DepartmentController;
