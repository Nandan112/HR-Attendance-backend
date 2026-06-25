const User = require('../models/User');
const Attendance = require('../models/Attendance');

// @desc    Get system stats (HR only)
// @route   GET /api/admin/stats
// @access  Private/HR_ADMIN
const getSystemStats = async (req, res) => {
  try {
    const totalEmployees = await User.countDocuments({ role: 'EMPLOYEE' });
    const activeEmployees = await User.countDocuments({ role: 'EMPLOYEE', isActive: true });
    
    const totalAdmins = await User.countDocuments({ role: 'HR_ADMIN' });
    
    // Get current month attendance
    const currentMonth = new Date().toISOString().split('T')[0].substring(0, 7);
    const attendanceCount = await Attendance.countDocuments({
      date: { $regex: `^${currentMonth}` },
    });

    const presentCount = await Attendance.countDocuments({
      date: { $regex: `^${currentMonth}` },
      status: 'PRESENT',
    });

    res.status(200).json({
      success: true,
      data: {
        employees: {
          total: totalEmployees,
          active: activeEmployees,
          inactive: totalEmployees - activeEmployees,
        },
        admins: totalAdmins,
        attendance: {
          total: attendanceCount,
          present: presentCount,
          attendanceRate: attendanceCount > 0 
            ? Math.round((presentCount / attendanceCount) * 100)
            : 0,
        },
        system: {
          lastUpdated: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Get System Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system stats',
    });
  }
};

// @desc    Get activity logs (HR only)
// @route   GET /api/admin/logs
// @access  Private/HR_ADMIN
const getActivityLogs = async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    // In production, you would have a Log model
    // For now, get recent attendance records
    const logs = await Attendance.find()
      .sort({ updatedAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: logs,
      total: await Attendance.countDocuments(),
    });
  } catch (error) {
    console.error('Get Activity Logs Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity logs',
    });
  }
};

// @desc    Cleanup old data (HR only)
// @route   POST /api/admin/cleanup
// @access  Private/HR_ADMIN
const cleanupData = async (req, res) => {
  try {
    const { yearsToKeep = 2 } = req.body;

    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - yearsToKeep);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    // Delete old attendance records
    const result = await Attendance.deleteMany({
      date: { $lt: cutoffStr },
    });

    res.status(200).json({
      success: true,
      data: {
        deletedCount: result.deletedCount,
        message: `Deleted ${result.deletedCount} records older than ${yearsToKeep} years`,
      },
    });
  } catch (error) {
    console.error('Cleanup Data Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup data',
    });
  }
};

module.exports = {
  getSystemStats,
  getActivityLogs,
  cleanupData,
};