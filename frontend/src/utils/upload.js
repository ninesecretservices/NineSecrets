import api from './api';

// Turns "Lounge Sets" -> "lounge-sets" so it's safe to use as a Cloudinary
// folder segment. Mirrored (defensively re-sanitized) on the backend too.
export const slugifyFolder = (s) =>
  (s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/**
 * @param {File} file
 * @param {string} [folder] - e.g. "products/lounge-sets" or "site/hero". Omit for the flat default folder.
 */
export const uploadFile = async (file, folder) => {
  const fd = new FormData();
  fd.append('image', file);
  if (folder) fd.append('folder', folder);
  const res = await api.post('/upload/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  return res.data.data.url;
};

// Best-effort cleanup — called whenever an admin replaces or removes an
// image, so Cloudinary storage doesn't fill up with orphaned files. A failed
// delete (network hiccup, already gone) should never block the admin's save.
export const deleteImage = async (url) => {
  if (!url) return;
  try {
    await api.post('/upload/delete', { url });
  } catch (err) {
    console.warn('Image cleanup failed for', url, err);
  }
};
