const User = require('../models/User');
const Attendance = require('../models/Attendance');

// @desc    Get all employees (HR only)
// @route   GET /api/employees
// @access  Private/HR_ADMIN
const getEmployees = async (req, res) => {
  try {
    const { searchTerm, department, status } = req.query;

    let query = { role: 'EMPLOYEE' };

    if (searchTerm) {
      query.$or = [
        { name: { $regex: searchTerm, $options: 'i' } },
        { employeeId: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } },
      ];
    }

    if (department) {
      query.department = { $regex: department, $options: 'i' };
    }

    const employees = await User.find(query).select('-password');

    // If status filter is provided, get today's attendance status
    if (status && status !== 'all') {
      const today = new Date().toISOString().split('T')[0];
      const employeeIds = employees.map(e => e.employeeId);
      
      const attendance = await Attendance.find({
        employeeId: { $in: employeeIds },
        date: today,
      });

      const employeeStatus = {};
      attendance.forEach(a => {
        employeeStatus[a.employeeId] = a.status.toLowerCase();
      });

      const filteredEmployees = employees.filter(emp => {
        const empStatus = employeeStatus[emp.employeeId] || 'absent';
        return empStatus === status.toLowerCase();
      });

      return res.status(200).json({
        success: true,
        data: filteredEmployees,
      });
    }

    res.status(200).json({
      success: true,
      data: employees,
    });
  } catch (error) {
    console.error('Get Employees Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employees',
    });
  }
};

// @desc    Get employee by ID
// @route   GET /api/employees/:employeeId
// @access  Private
const getEmployeeById = async (req, res) => {
  try {
    const { employeeId } = req.params;

    // Check if user is accessing their own profile or is HR
    if (req.user.role !== 'HR_ADMIN' && req.user.employeeId !== employeeId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this profile',
      });
    }

    const employee = await User.findOne({ employeeId }).select('-password');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    res.status(200).json({
      success: true,
      data: employee,
    });
  } catch (error) {
    console.error('Get Employee Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employee',
    });
  }
};

// @desc    Update employee (HR only)
// @route   PUT /api/employees/:employeeId
// @access  Private/HR_ADMIN
const updateEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { name, email, department, phone, role, isActive } = req.body;

    const employee = await User.findOne({ employeeId });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    // Update fields
    if (name) employee.name = name;
    if (email) employee.email = email;
    if (department) employee.department = department;
    if (phone) employee.phone = phone;
    if (role) employee.role = role;
    if (isActive !== undefined) employee.isActive = isActive;
    employee.updatedAt = Date.now();

    await employee.save();

    const updatedEmployee = employee.toObject();
    delete updatedEmployee.password;

    res.status(200).json({
      success: true,
      data: updatedEmployee,
      message: 'Employee updated successfully',
    });
  } catch (error) {
    console.error('Update Employee Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update employee',
    });
  }
};

// @desc    Delete employee (HR only)
// @route   DELETE /api/employees/:employeeId
// @access  Private/HR_ADMIN
const deleteEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const employee = await User.findOneAndDelete({ employeeId });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    // Delete all attendance records for this employee
    await Attendance.deleteMany({ employeeId });

    res.status(200).json({
      success: true,
      message: 'Employee deleted successfully',
    });
  } catch (error) {
    console.error('Delete Employee Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete employee',
    });
  }
};

// @desc    Get employees by department (HR only)
// @route   GET /api/employees/department/:department
// @access  Private/HR_ADMIN
const getEmployeesByDepartment = async (req, res) => {
  try {
    const { department } = req.params;

    const employees = await User.find({
      department: { $regex: department, $options: 'i' },
      role: 'EMPLOYEE',
    }).select('-password');

    res.status(200).json({
      success: true,
      data: employees,
    });
  } catch (error) {
    console.error('Get Employees By Department Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employees',
    });
  }
};

// @desc    Get employee attendance summary (HR only)
// @route   GET /api/employees/:employeeId/attendance-summary
// @access  Private
const getEmployeeAttendanceSummary = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { year, month } = req.query;

    // Check authorization
    if (req.user.role !== 'HR_ADMIN' && req.user.employeeId !== employeeId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this data',
      });
    }

    const user = await User.findOne({ employeeId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    let dateFilter = {};
    if (year && month) {
      const monthStr = month.toString().padStart(2, '0');
      dateFilter = { date: { $regex: `^${year}-${monthStr}` } };
    } else {
      const currentMonth = new Date().toISOString().slice(0, 7);
      dateFilter = { date: { $regex: `^${currentMonth}` } };
    }

    const records = await Attendance.find({
      employeeId,
      ...dateFilter,
    });

    const summary = {
      total: records.length,
      present: records.filter(r => r.status === 'PRESENT').length,
      absent: records.filter(r => r.status === 'ABSENT').length,
      late: records.filter(r => r.status === 'LATE').length,
      halfDay: records.filter(r => r.status === 'HALF_DAY').length,
      leave: records.filter(r => r.status === 'LEAVE').length,
    };

    // Calculate attendance percentage
    const totalDays = summary.present + summary.absent + summary.late;
    summary.attendancePercentage = totalDays > 0 
      ? Math.round((summary.present / totalDays) * 100)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        employee: {
          employeeId: user.employeeId,
          name: user.name,
          department: user.department,
        },
        summary,
        records,
      },
    });
  } catch (error) {
    console.error('Get Employee Attendance Summary Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance summary',
    });
  }
};

module.exports = {
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  getEmployeesByDepartment,
  getEmployeeAttendanceSummary,
};