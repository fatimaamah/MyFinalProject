const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { requireRole } = require('../middleware/auth');
const studentController = require('../controllers/studentController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|jpg|jpeg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only PDF, DOC, DOCX, and images are allowed'));
  }
});

router.use(requireRole('student'));

router.get('/dashboard', studentController.getDashboard);
router.get('/upload-report', studentController.getUploadReport);
router.post('/upload-report', upload.single('report'), studentController.postUploadReport);
router.get('/report/:id', studentController.getReportDetails);
router.get('/reupload/:id', studentController.getReuploadReport);
router.post('/reupload/:id', upload.single('report'), studentController.postReuploadReport);

module.exports = router;
