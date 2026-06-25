const Attendance = require('../models/Attendance');
const User = require('../models/User');

// @desc    Export report (HR only)
// @route   GET /api/reports/export
// @access  Private/HR_ADMIN
const exportReport = async (req, res) => {
  try {
    const { startDate, endDate, format, department } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required',
      });
    }

    // Build query
    let query = {
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    };

    // If department filter is provided, get employees in that department
    if (department) {
      const employees = await User.find({
        department: { $regex: department, $options: 'i' },
        role: 'EMPLOYEE',
      });
      const employeeIds = employees.map(e => e.employeeId);
      query.employeeId = { $in: employeeIds };
    }

    const records = await Attendance.find(query).sort({ date: 1, employeeId: 1 });

    // Format data for CSV
    const csvData = records.map(record => ({
      'Employee ID': record.employeeId,
      'Employee Name': record.employeeName,
      'Date': record.date,
      'Check In': record.checkInTime || 'N/A',
      'Check Out': record.checkOutTime || 'N/A',
      'Status': record.status,
      'Working Hours': record.workingHours || 0,
      'Location': record.checkInLocation || record.checkOutLocation || 'N/A',
    }));

    // For now, return JSON data. In production, generate CSV/PDF
    res.status(200).json({
      success: true,
      data: csvData,
      message: 'Report exported successfully',
    });
  } catch (error) {
    console.error('Export Report Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export report',
    });
  }
};

// @desc    Get department wise report (HR only)
// @route   GET /api/reports/department
// @access  Private/HR_ADMIN
const getDepartmentReport = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required',
      });
    }

    // Get all employees grouped by department
    const employees = await User.find({ role: 'EMPLOYEE' }).select('employeeId department name');
    
    const departmentMap = {};
    employees.forEach(emp => {
      if (!departmentMap[emp.department]) {
        departmentMap[emp.department] = {
          department: emp.department,
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          employees: [],
        };
      }
      departmentMap[emp.department].total++;
      departmentMap[emp.department].employees.push({
        employeeId: emp.employeeId,
        name: emp.name,
      });
    });

    // Get attendance for the date
    const attendance = await Attendance.find({ date });
    const attendanceMap = {};
    attendance.forEach(a => {
      attendanceMap[a.employeeId] = a.status;
    });

    // Calculate department stats
    const result = Object.values(departmentMap).map(dept => {
      dept.employees.forEach(emp => {
        const status = attendanceMap[emp.employeeId] || 'ABSENT';
        if (status === 'PRESENT') dept.present++;
        else if (status === 'ABSENT') dept.absent++;
        else if (status === 'LATE') dept.late++;
      });
      return {
        department: dept.department,
        total: dept.total,
        present: dept.present,
        absent: dept.absent,
        late: dept.late,
        attendancePercentage: dept.total > 0 
          ? Math.round((dept.present / dept.total) * 100)
          : 0,
      };
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get Department Report Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch department report',
    });
  }
};

// @desc    Get attendance trends (HR only)
// @route   GET /api/reports/trends
// @access  Private/HR_ADMIN
const getAttendanceTrends = async (req, res) => {
  try {
    const { months = 6 } = req.query;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const records = await Attendance.find({
      date: {
        $gte: startStr,
        $lte: endStr,
      },
    });

    // Group by month
    const monthlyData = {};
    records.forEach(record => {
      const month = record.date.substring(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = {
          month,
          present: 0,
          absent: 0,
          late: 0,
          total: 0,
        };
      }
      monthlyData[month].total++;
      const status = record.status;
      if (status === 'PRESENT') monthlyData[month].present++;
      else if (status === 'ABSENT') monthlyData[month].absent++;
      else if (status === 'LATE') monthlyData[month].late++;
    });

    const result = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get Attendance Trends Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance trends',
    });
  }
};

module.exports = {
  exportReport,
  getDepartmentReport,
  getAttendanceTrends,
};