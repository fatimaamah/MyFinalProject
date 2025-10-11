const express = require('express');
const router = express.Router();
const { requireRole } = require('../middleware/auth');
const supervisorController = require('../controllers/supervisorController');

router.use(requireRole('supervisor'));

router.get('/dashboard', supervisorController.getDashboard);
router.get('/student/:studentId', supervisorController.getStudentReports);
router.get('/report/:id', supervisorController.getReportDetails);
router.post('/feedback', supervisorController.postFeedback);
router.post('/move-to-next-stage', supervisorController.moveToNextStage);

module.exports = router;
