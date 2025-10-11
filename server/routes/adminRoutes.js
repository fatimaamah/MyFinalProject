const express = require('express');
const router = express.Router();
const { requireRole } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

router.use(requireRole('general_admin'));

router.get('/dashboard', adminController.getDashboard);
router.get('/add-coordinator', adminController.getAddCoordinator);
router.post('/add-coordinator', adminController.postAddCoordinator);
router.get('/edit-coordinator/:id', adminController.getEditCoordinator);
router.post('/edit-coordinator/:id', adminController.postEditCoordinator);
router.post('/delete-coordinator/:id', adminController.deleteCoordinator);
router.get('/activity-logs', adminController.getActivityLogs);

module.exports = router;
