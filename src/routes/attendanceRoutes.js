const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const {
  submitAttendance,
  getTodayAttendance,
  getAttendanceHistory,
  getMonthlyAttendance,
  getDailyReport,
  getAttendanceAnalytics,
  markAttendance,
  getAttendanceByDate,
  getWeeklyAttendance,
  getAttendanceStats,
  bulkAttendance,
  getPresentEmployees,
  getAbsentEmployees,
  getLateArrivals,
  getDashboardStats,
} = require('../controllers/attendanceController');

// All routes require authentication
router.use(protect);

// Employee routes
router.post(
  '/submit',
  [
    body('employeeId').notEmpty().withMessage('Employee ID is required'),
    body('date').notEmpty().withMessage('Date is required'),
    body('time').notEmpty().withMessage('Time is required'),
    body('type').isIn(['CHECK_IN', 'CHECK_OUT']).withMessage('Invalid attendance type'),
  ],
  submitAttendance
);

router.get('/today/:employeeId', getTodayAttendance);
router.get('/history/:employeeId', getAttendanceHistory);
router.get('/monthly/:employeeId', getMonthlyAttendance);

// ✅ Employee weekly attendance
router.get('/weekly/:employeeId', getWeeklyAttendance);

// ✅ HR only routes
router.get('/daily-report', authorize('HR_ADMIN'), getDailyReport);
router.get('/analytics', authorize('HR_ADMIN'), getAttendanceAnalytics);
router.post('/mark', authorize('HR_ADMIN'), markAttendance);

// ✅ New HR routes
router.get('/by-date', authorize('HR_ADMIN'), getAttendanceByDate);
router.get('/stats', authorize('HR_ADMIN'), getAttendanceStats);
router.post('/bulk', authorize('HR_ADMIN'), bulkAttendance);
router.get('/present', authorize('HR_ADMIN'), getPresentEmployees);
router.get('/absent', authorize('HR_ADMIN'), getAbsentEmployees);
router.get('/late', authorize('HR_ADMIN'), getLateArrivals);
router.get('/dashboard-stats', getDashboardStats);

module.exports = router;