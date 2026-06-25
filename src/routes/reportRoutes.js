const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  exportReport,
  getDepartmentReport,
  getAttendanceTrends,
} = require('../controllers/reportController');

// All routes require authentication and HR_ADMIN role
router.use(protect);
router.use(authorize('HR_ADMIN'));

router.get('/export', exportReport);
router.get('/department', getDepartmentReport);
router.get('/trends', getAttendanceTrends);

module.exports = router;