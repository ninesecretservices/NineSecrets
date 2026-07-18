import ApiError from '../utils/ApiError.js';
import { fetchData, executeData } from '../methods.js';

const DESCRIPTION_TEMPLATE_SCHEMA = {
  name: { required: true },
  body: { required: true },
  isDeleted: { default: false },
};

class DescriptionTemplateController {
  async descriptionTemplateList(req, res, next) {
    const { page = 1, limit = 100, search = '' } = req.body;
    const filter = { isDeleted: false };
    if (search) filter.name = { $regex: search, $options: 'i' };

    const { data } = await fetchData('descriptiontemplates', {}, filter, {
      sort: { createdAt: -1 },
      skip: (page - 1) * limit,
      limit,
    });
    const { count: total } = await fetchData('descriptiontemplates', { _id: 1 }, filter, { count: true });

    res.locals.responseData = { success: true, data: { docs: data, total, page, limit } };
    next();
  }

  async descriptionTemplateCreate(req, res, next) {
    const data = { ...req.body, createdBy: req.user.id };
    const { data: newDoc } = await executeData('descriptiontemplates', data, 'i', DESCRIPTION_TEMPLATE_SCHEMA);

    res.locals.responseData = { success: true, message: 'Description template created successfully', data: newDoc };
    next();
  }

  async descriptionTemplateUpdate(req, res, next) {
    const { id, ...data } = req.body;
    if (!id) throw new ApiError(400, 'Description template ID is required');

    const result = await executeData('descriptiontemplates', { ...data, updatedBy: req.user.id }, 'u', DESCRIPTION_TEMPLATE_SCHEMA, { _id: id });
    if (!result.success) throw new ApiError(404, 'Description template not found');

    res.locals.responseData = { success: true, message: 'Description template updated successfully', data: result.data };
    next();
  }

  async descriptionTemplateDelete(req, res, next) {
    const { id } = req.body;
    if (!id) throw new ApiError(400, 'Description template ID is required');

    const result = await executeData('descriptiontemplates', null, 'd', null, { _id: id }, { deletedBy: req.user.id });
    if (!result.success) throw new ApiError(404, 'Description template not found');

    res.locals.responseData = { success: true, message: 'Description template deleted successfully' };
    next();
  }

  async descriptionTemplateDetail(req, res, next) {
    const { id } = req.body;
    if (!id) throw new ApiError(400, 'Description template ID is required');

    const { data } = await fetchData('descriptiontemplates', {}, { _id: id, isDeleted: false });
    if (!data[0]) throw new ApiError(404, 'Description template not found');

    res.locals.responseData = { success: true, data: data[0] };
    next();
  }
}

export default DescriptionTemplateController;
