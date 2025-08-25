const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

class CloudinaryStorage {
  uploadFromBuffer(buffer, filename) {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'products', public_id: filename },
        (err, result) => {
          if (err) reject(err);
          else resolve({ url: result.secure_url, public_id: result.public_id });
        }
      );
      stream.end(buffer); // envia o buffer
    });
  }

  async uploadFromUrl(url) {
    const result = await cloudinary.uploader.upload(url, { folder: 'products' });
    return { url: result.secure_url, public_id: result.public_id };
  }

  async delete(publicId) {
    return cloudinary.uploader.destroy(publicId);
  }
}

module.exports = new CloudinaryStorage();
