const multer = require('multer');
const AppError = require('../utils/AppError');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Apenas imagens são permitidas.', 400), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
});

module.exports = upload;