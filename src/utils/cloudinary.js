const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload an image to Cloudinary
 * @param {string} fileBuffer - Base64 encoded file or file path
 * @param {object} options - Upload options
 * @returns {Promise<object>} - Cloudinary upload result
 */
const uploadImage = async (fileBuffer, options = {}) => {
  try {
    const defaultOptions = {
      folder: 'students',
      resource_type: 'image',
      transformation: [
        { width: 500, height: 500, crop: 'limit' },
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    };

    const uploadOptions = { ...defaultOptions, ...options };

    // If fileBuffer is a base64 string, upload directly
    if (typeof fileBuffer === 'string' && fileBuffer.startsWith('data:')) {
      const result = await cloudinary.uploader.upload(fileBuffer, uploadOptions);
      return result;
    }

    // If it's a buffer, convert to base64 data URI
    if (Buffer.isBuffer(fileBuffer)) {
      const base64 = fileBuffer.toString('base64');
      const dataUri = `data:image/jpeg;base64,${base64}`;
      const result = await cloudinary.uploader.upload(dataUri, uploadOptions);
      return result;
    }

    // If it's a file path
    const result = await cloudinary.uploader.upload(fileBuffer, uploadOptions);
    return result;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image to Cloudinary');
  }
};

/**
 * Delete an image from Cloudinary
 * @param {string} publicId - The public ID of the image to delete
 * @returns {Promise<object>} - Cloudinary deletion result
 */
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error('Failed to delete image from Cloudinary');
  }
};

/**
 * Extract public ID from Cloudinary URL
 * @param {string} url - Cloudinary URL
 * @returns {string|null} - Public ID or null
 */
const extractPublicId = (url) => {
  if (!url || !url.includes('cloudinary.com')) {
    return null;
  }
  
  try {
    // URL format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{folder}/{public_id}.{format}
    const regex = /\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/;
    const match = url.match(regex);
    return match ? match[1] : null;
  } catch (error) {
    return null;
  }
};

module.exports = {
  cloudinary,
  uploadImage,
  deleteImage,
  extractPublicId
};
