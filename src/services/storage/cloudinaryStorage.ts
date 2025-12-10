import { v2 as cloudinary } from 'cloudinary';
import { IStorageProvider, IStorageResult } from './storage.interface';
import dotenv from 'dotenv';
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

class CloudinaryStorage implements IStorageProvider {
  uploadFromBuffer(buffer: Buffer, filename: string): Promise<IStorageResult> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'products', public_id: filename },
        (err, result) => {
          if (err) {reject(err);}
          else if (result) {resolve({ url: result.secure_url, public_id: result.public_id });}
          else {reject(new Error('Upload failed, no result returned'));}
        }
      );
      stream.end(buffer); // envia o buffer
    });
  }

  async uploadFromUrl(url: string): Promise<IStorageResult> {
    const result = await cloudinary.uploader.upload(url, { folder: 'products' });
    return { url: result.secure_url, public_id: result.public_id };
  }

  async delete(publicId: string): Promise<any> {
    return cloudinary.uploader.destroy(publicId);
  }
}

export default new CloudinaryStorage();
