// services/storage/index.js
class StorageProvider {
  async upload(filePath) {
    throw new Error('Método upload não implementado');
  }

  async delete(publicId) {
    throw new Error('Método delete não implementado');
  }
}

module.exports = StorageProvider;
