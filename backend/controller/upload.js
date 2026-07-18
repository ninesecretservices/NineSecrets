import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import ApiError from '../utils/ApiError.js';

// Cloudinary is used when credentials are configured; otherwise files stay on
// local disk under /temp (dev fallback — not durable for production).
const cloudinaryConfigured =
  !!process.env.CLOUDINARY_CLOUD_NAME &&
  !!process.env.CLOUDINARY_API_KEY &&
  !!process.env.CLOUDINARY_API_SECRET;

if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Extract the public_id Cloudinary needs for destroy() out of a secure_url,
// e.g. https://res.cloudinary.com/<cloud>/image/upload/v169.../nine-secrets/abc123.png
// -> "nine-secrets/abc123". Returns null for anything that isn't one of our
// own Cloudinary URLs (local /temp/ paths, external URLs, etc.) so callers
// can silently skip those instead of erroring.
export function cloudinaryPublicId(url) {
  if (typeof url !== 'string') return null;
  const marker = '/image/upload/';
  const idx = url.indexOf(marker);
  if (!url.includes('res.cloudinary.com') || idx === -1) return null;
  let rest = url.slice(idx + marker.length);
  rest = rest.replace(/^v\d+\//, ''); // drop the version segment
  const { dir, name } = path.parse(rest);
  return dir ? `${dir}/${name}` : name;
}

// Defense in depth: the frontend already slugifies folder hints (e.g.
// "products/lounge-sets", "site/hero"), but this is client input reaching a
// third-party API — never trust it blindly. Keep only safe path segments and
// always nest under the base "nine-secrets" namespace.
function safeFolder(hint) {
  if (typeof hint !== 'string' || !hint.trim()) return 'nine-secrets';
  const segments = hint
    .toLowerCase()
    .split('/')
    .map((s) => s.replace(/[^a-z0-9-_]/g, ''))
    .filter(Boolean)
    .slice(0, 3); // cap nesting depth
  return segments.length ? `nine-secrets/${segments.join('/')}` : 'nine-secrets';
}

class UploadController {
  async uploadImage(req, res, next) {
    if (!req.file) {
      throw new ApiError(400, 'No file uploaded');
    }

    let url;
    if (cloudinaryConfigured) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: safeFolder(req.body.folder),
          resource_type: 'image',
        });
        url = result.secure_url;
      } finally {
        // Local temp copy is no longer needed once pushed to Cloudinary.
        fs.unlink(req.file.path, () => {});
      }
    } else {
      url = `/temp/${req.file.filename}`;
    }

    res.locals.responseData = {
      success: true,
      message: 'Image uploaded successfully',
      data: { url, storage: cloudinaryConfigured ? 'cloudinary' : 'local' },
    };
    next();
  }

  // Called whenever the admin replaces or removes an image (product photos,
  // homepage hero/category/promise images) so Cloudinary storage doesn't fill
  // up with orphaned files nobody references anymore. Best-effort: a missing
  // or already-deleted asset isn't an error from the caller's point of view.
  async deleteImage(req, res, next) {
    const { url } = req.body;
    if (!url) throw new ApiError(400, 'Image URL is required');

    if (cloudinaryConfigured) {
      const publicId = cloudinaryPublicId(url);
      if (publicId) {
        try {
          await cloudinary.uploader.destroy(publicId);
        } catch (err) {
          console.warn('Cloudinary delete failed for', publicId, ':', err.message);
        }
      }
    } else if (url.startsWith('/temp/')) {
      fs.unlink(path.join(process.cwd(), url), () => {});
    }

    res.locals.responseData = { success: true, message: 'Image removed' };
    next();
  }
}

export default UploadController;
