import ApiError from '../utils/ApiError.js';
import { fetchData, executeData } from '../methods.js';

const COLOUR_SCHEMA = {
  name: { required: true },
  status: { default: 'active', enum: ['active', 'inactive'] },
  isDeleted: { default: false },
};

class ColourController {
  async colourList(req, res, next) {
    const { page = 1, limit = 10, search = '' } = req.body;
    const filter = { isDeleted: false };
    if (search) filter.name = { $regex: search, $options: 'i' };

    const { data } = await fetchData('colours', {}, filter, {
      sort: { createdAt: -1 },
      skip: (page - 1) * limit,
      limit,
    });
    const { count: total } = await fetchData('colours', { _id: 1 }, filter, { count: true });

    res.locals.responseData = { success: true, data: { docs: data, total, page, limit } };
    next();
  }

  async colourCreate(req, res, next) {
    const data = { ...req.body, createdBy: req.user.id };
    const { data: newDoc } = await executeData('colours', data, 'i', COLOUR_SCHEMA);

    res.locals.responseData = { success: true, message: 'Colour created successfully', data: newDoc };
    next();
  }

  async colourUpdate(req, res, next) {
    const { id, ...data } = req.body;
    if (!id) throw new ApiError(400, 'Colour ID is required');

    const result = await executeData('colours', { ...data, updatedBy: req.user.id }, 'u', COLOUR_SCHEMA, { _id: id });
    if (!result.success) throw new ApiError(404, 'Colour not found');

    res.locals.responseData = { success: true, message: 'Colour updated successfully', data: result.data };
    next();
  }

  async colourDelete(req, res, next) {
    const { id } = req.body;
    if (!id) throw new ApiError(400, 'Colour ID is required');

    const result = await executeData('colours', null, 'd', null, { _id: id }, { deletedBy: req.user.id });
    if (!result.success) throw new ApiError(404, 'Colour not found');

    res.locals.responseData = { success: true, message: 'Colour deleted successfully' };
    next();
  }

  async colourDetail(req, res, next) {
    const { id } = req.body;
    if (!id) throw new ApiError(400, 'Colour ID is required');

    const { data } = await fetchData('colours', {}, { _id: id, isDeleted: false });
    if (!data[0]) throw new ApiError(404, 'Colour not found');

    res.locals.responseData = { success: true, data: data[0] };
    next();
  }
}

export default ColourController;
