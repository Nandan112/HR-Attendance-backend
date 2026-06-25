const express = require('express');
const Adminrouter = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getSystemStats,
  getActivityLogs,
  cleanupData,
} = require('../controllers/adminController');

// All routes require authentication and HR_ADMIN role
Adminrouter.use(protect);
Adminrouter.use(authorize('HR_ADMIN'));

Adminrouter.get('/stats', getSystemStats);
Adminrouter.get('/logs', getActivityLogs);
Adminrouter.post('/cleanup', cleanupData);

module.exports = Adminrouter;