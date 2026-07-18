import ApiError from '../utils/ApiError.js';
import { fetchData, executeData, toObjectId } from '../methods.js';

const ITEM_SCHEMA = {
  name: { required: true },
  status: { default: 'active', enum: ['active', 'inactive'] },
  isDeleted: { default: false },
};

// Items reference a single department — rather than pull in Mongoose just for
// this one join, fetch the department names in a second query and merge them.
async function withDepartmentNames(docs) {
  const ids = [...new Set(docs.map((d) => String(d.department)).filter(Boolean))];
  if (ids.length === 0) return docs;
  const { data: departments } = await fetchData('departments', { name: 1 }, { _id: { $in: ids.map(toObjectId) } });
  const byId = new Map(departments.map((d) => [String(d._id), { _id: d._id, name: d.name }]));
  return docs.map((d) => ({ ...d, department: byId.get(String(d.department)) || d.department }));
}

class ItemController {
  async itemList(req, res, next) {
    const { page = 1, limit = 10, search = '' } = req.body;
    const filter = { isDeleted: false };
    if (search) filter.name = { $regex: search, $options: 'i' };

    const { data } = await fetchData('items', {}, filter, {
      sort: { createdAt: -1 },
      skip: (page - 1) * limit,
      limit,
    });
    const { count: total } = await fetchData('items', { _id: 1 }, filter, { count: true });
    const docs = await withDepartmentNames(data);

    res.locals.responseData = { success: true, data: { docs, total, page, limit } };
    next();
  }

  async itemCreate(req, res, next) {
    const data = { ...req.body, createdBy: req.user.id };
    const { data: newDoc } = await executeData('items', data, 'i', ITEM_SCHEMA, null, { objectIdFields: ['department'] });

    res.locals.responseData = { success: true, message: 'Item created successfully', data: newDoc };
    next();
  }

  async itemUpdate(req, res, next) {
    const { id, ...data } = req.body;
    if (!id) throw new ApiError(400, 'Item ID is required');

    const result = await executeData('items', { ...data, updatedBy: req.user.id }, 'u', ITEM_SCHEMA, { _id: id }, { objectIdFields: ['department'] });
    if (!result.success) throw new ApiError(404, 'Item not found');

    res.locals.responseData = { success: true, message: 'Item updated successfully', data: result.data };
    next();
  }

  async itemDelete(req, res, next) {
    const { id } = req.body;
    if (!id) throw new ApiError(400, 'Item ID is required');

    const result = await executeData('items', null, 'd', null, { _id: id }, { deletedBy: req.user.id });
    if (!result.success) throw new ApiError(404, 'Item not found');

    res.locals.responseData = { success: true, message: 'Item deleted successfully' };
    next();
  }

  async itemDetail(req, res, next) {
    const { id } = req.body;
    if (!id) throw new ApiError(400, 'Item ID is required');

    const { data } = await fetchData('items', {}, { _id: id, isDeleted: false });
    if (!data[0]) throw new ApiError(404, 'Item not found');

    res.locals.responseData = { success: true, data: data[0] };
    next();
  }
}

export default ItemController;
