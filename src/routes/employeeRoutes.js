const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  getEmployeesByDepartment,
  getEmployeeAttendanceSummary,
} = require('../controllers/employeeController');

// All routes require authentication
router.use(protect);

// Employee routes (accessible by employee for their own data)
router.get('/:employeeId', getEmployeeById);
router.get('/:employeeId/attendance-summary', getEmployeeAttendanceSummary);

// HR only routes
router.get('/', authorize('HR_ADMIN'), getEmployees);
router.put('/:employeeId', authorize('HR_ADMIN'), updateEmployee);
router.delete('/:employeeId', authorize('HR_ADMIN'), deleteEmployee);
router.get('/department/:department', authorize('HR_ADMIN'), getEmployeesByDepartment);

module.exports = router;