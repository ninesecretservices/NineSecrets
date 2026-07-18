import fs from 'fs';
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

class UploadController {
  async uploadImage(req, res, next) {
    if (!req.file) {
      throw new ApiError(400, 'No file uploaded');
    }

    let url;
    if (cloudinaryConfigured) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'nine-secrets',
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
}

export default UploadController;
