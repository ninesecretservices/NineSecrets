import Setting from '../schema/Setting.js';
import ApiError from '../utils/ApiError.js';

// Keys the storefront may read without auth.
const PUBLIC_KEYS = ['homepage', 'commerce', 'theme'];
const MAX_VERSIONS = 10;

class SettingController {
  // Public: storefront reads PUBLISHED content.
  async settingPublicDetail(req, res, next) {
    const { key } = req.body;
    if (!key || !PUBLIC_KEYS.includes(key)) throw new ApiError(400, 'Invalid setting key');
    const doc = await Setting.findOne({ key });
    res.locals.responseData = { success: true, data: doc?.value || {} };
    next();
  }

  // Admin preview: draft when one exists, else published.
  async settingPreviewDetail(req, res, next) {
    const { key } = req.body;
    if (!key || !PUBLIC_KEYS.includes(key)) throw new ApiError(400, 'Invalid setting key');
    const doc = await Setting.findOne({ key });
    res.locals.responseData = { success: true, data: doc?.draft ?? doc?.value ?? {} };
    next();
  }

  // Admin: full state for the editor (draft, published, version metadata, audit).
  async settingDetail(req, res, next) {
    const { key } = req.body;
    if (!key) throw new ApiError(400, 'Setting key is required');
    const doc = await Setting.findOne({ key });
    res.locals.responseData = {
      success: true,
      data: {
        published: doc?.value || {},
        draft: doc?.draft || null,
        hasDraft: !!doc?.draft,
        versions: (doc?.versions || []).map((v, i) => ({
          index: i,
          publishedAt: v.publishedAt,
          publishedBy: v.publishedBy,
        })),
        updatedAt: doc?.updatedAt,
        updatedByName: doc?.updatedByName,
      },
    };
    next();
  }

  // Admin: save working copy without touching the live site.
  async settingSaveDraft(req, res, next) {
    const { key, value } = req.body;
    if (!key) throw new ApiError(400, 'Setting key is required');
    if (typeof value !== 'object' || value === null) throw new ApiError(400, 'Value must be an object');

    await Setting.findOneAndUpdate(
      { key },
      { draft: value, updatedBy: req.user.id, updatedByName: req.user.name },
      { upsert: true, setDefaultsOnInsert: true }
    );
    res.locals.responseData = { success: true, message: 'Draft saved', data: { hasDraft: true } };
    next();
  }

  // Admin: publish the draft (or a directly provided value). Previous live
  // content is pushed onto the version history.
  async settingPublish(req, res, next) {
    const { key, value } = req.body;
    if (!key) throw new ApiError(400, 'Setting key is required');

    const doc = await Setting.findOne({ key });
    const next_ = value ?? doc?.draft;
    if (typeof next_ !== 'object' || next_ === null) throw new ApiError(400, 'Nothing to publish');

    const versions = doc?.versions || [];
    if (doc && doc.value && Object.keys(doc.value).length > 0) {
      versions.unshift({ content: doc.value, publishedAt: new Date(), publishedBy: req.user.name });
      versions.splice(MAX_VERSIONS);
    }

    await Setting.findOneAndUpdate(
      { key },
      { value: next_, draft: null, versions, updatedBy: req.user.id, updatedByName: req.user.name },
      { upsert: true, setDefaultsOnInsert: true }
    );

    res.locals.responseData = { success: true, message: 'Published', data: next_ };
    next();
  }

  // Admin: restore a previous published version (current live goes into history).
  async settingRevert(req, res, next) {
    const { key, versionIndex } = req.body;
    if (!key) throw new ApiError(400, 'Setting key is required');

    const doc = await Setting.findOne({ key });
    const version = doc?.versions?.[versionIndex];
    if (!version) throw new ApiError(404, 'Version not found');

    const versions = doc.versions.filter((_, i) => i !== versionIndex);
    versions.unshift({ content: doc.value, publishedAt: new Date(), publishedBy: req.user.name });
    versions.splice(MAX_VERSIONS);

    await Setting.findOneAndUpdate(
      { key },
      { value: version.content, draft: null, versions, updatedBy: req.user.id, updatedByName: req.user.name }
    );

    res.locals.responseData = { success: true, message: 'Version restored', data: version.content };
    next();
  }
}

export default SettingController;
