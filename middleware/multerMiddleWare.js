const multer = require('multer');
const path = require('path');

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Save files to uploads/images/
    cb(null, 'uploads/images/');
  },
  filename: (req, file, cb) => {
    // Generate unique file name: product-timestamp-random.ext
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const random = Math.random().toString(36).slice(2);
    cb(null, `product-${timestamp}-${random}${ext}`);
  }
});

// File filter to allow only JPEG and PNG
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true); // Accept file
  } else {
    cb(new Error('Only JPEG, JPG, and PNG images are allowed'), false);
  }
};

// Multer configuration
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Max 5 files
  },
  fileFilter
});

module.exports = {upload};