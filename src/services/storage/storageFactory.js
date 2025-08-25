const cloudinaryStorage = require('./cloudinaryStorage');

const PROVIDER = process.env.STORAGE_PROVIDER || 'cloudinary';

function getStorageProvider() {
  switch (PROVIDER) {
    case 'cloudinary':
      return cloudinaryStorage;
    default:
      throw new Error(`Provedor de storage desconhecido: ${PROVIDER}`);
  }
}

module.exports = getStorageProvider();
