const Attendance = require('../models/Attendance');
const User = require('../models/User');

// @desc    Submit attendance (check-in/check-out)
// @route   POST /api/attendance/submit
// @access  Private
const submitAttendance = async (req, res) => {
  try {
    const {
      employeeId,
      employeeName,
      date,
      time,
      latitude,
      longitude,
      type,
      photoUrl,
      location,
      notes,
    } = req.body;

    if (!employeeId || !date || !time || !type) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    // Verify user exists
    const user = await User.findOne({ employeeId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if attendance record exists for today
    let attendance = await Attendance.findOne({ employeeId, date });

    if (type === 'CHECK_IN') {
      // Create new attendance record or update if exists
      if (attendance) {
        // Check if already checked in
        if (attendance.checkInTime) {
          return res.status(400).json({
            success: false,
            message: 'Already checked in today',
          });
        }
        // Update existing record
        attendance.checkInTime = time;
        attendance.checkInLocation = location || `${latitude}, ${longitude}`;
        attendance.latitude = latitude;
        attendance.longitude = longitude;
        attendance.checkInNotes = notes || '';
        attendance.photoUrl = photoUrl || attendance.photoUrl;
        attendance.status = 'PRESENT';
        attendance.updatedAt = Date.now();
        await attendance.save();
      } else {
        // Create new attendance record
        attendance = await Attendance.create({
          employeeId,
          employeeName: user.name,
          date,
          checkInTime: time,
          checkInLocation: location || `${latitude}, ${longitude}`,
          latitude,
          longitude,
          checkInNotes: notes || '',
          photoUrl: photoUrl || '',
          status: 'PRESENT',
        });
      }
    } else if (type === 'CHECK_OUT') {
      if (!attendance) {
        return res.status(400).json({
          success: false,
          message: 'No check-in record found for today',
        });
      }

      if (attendance.checkOutTime) {
        return res.status(400).json({
          success: false,
          message: 'Already checked out today',
        });
      }

      // Update check-out
      attendance.checkOutTime = time;
      attendance.checkOutLocation = location || `${latitude}, ${longitude}`;
      attendance.checkOutNotes = notes || '';
      attendance.updatedAt = Date.now();

      // Calculate working hours if checkInTime exists
      if (attendance.checkInTime) {
        const checkIn = new Date(`${date}T${attendance.checkInTime}`);
        const checkOut = new Date(`${date}T${time}`);
        const diffHours = (checkOut - checkIn) / (1000 * 60 * 60);
        attendance.workingHours = Math.round(diffHours * 100) / 100;
      }

      await attendance.save();
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid attendance type',
      });
    }

    res.status(200).json({
      success: true,
      data: attendance,
      message: `Attendance ${type === 'CHECK_IN' ? 'checked in' : 'checked out'} successfully`,
    });
  } catch (error) {
    console.error('Submit Attendance Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit attendance',
    });
  }
};

// @desc    Get today's attendance for a user
// @route   GET /api/attendance/today/:employeeId
// @access  Private
const getTodayAttendance = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const today = new Date().toISOString().split('T')[0];

    const attendance = await Attendance.findOne({ employeeId, date: today });

    if (!attendance) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No attendance record for today',
      });
    }

    // Format response for frontend
    const response = {
      date: attendance.date,
      checkInTime: attendance.checkInTime,
      checkOutTime: attendance.checkOutTime,
      status: attendance.status.toLowerCase(),
      location: attendance.checkInLocation || attendance.checkOutLocation,
    };

    res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Get Today Attendance Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance',
    });
  }
};

// @desc    Get attendance history
// @route   GET /api/attendance/history/:employeeId
// @access  Private
const getAttendanceHistory = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { month } = req.query;

    if (!month) {
      return res.status(400).json({
        success: false,
        message: 'Month parameter is required',
      });
    }

    const records = await Attendance.find({
      employeeId,
      date: { $regex: `^${month}` },
    }).sort({ date: -1 });

    // Format records for frontend
    const formattedRecords = records.map(record => ({
      date: record.date,
      checkInTime: record.checkInTime,
      checkOutTime: record.checkOutTime,
      status: record.status.toLowerCase(),
      location: record.checkInLocation || record.checkOutLocation,
    }));

    res.status(200).json({
      success: true,
      data: formattedRecords,
    });
  } catch (error) {
    console.error('Get Attendance History Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance history',
    });
  }
};

// @desc    Get monthly attendance summary
// @route   GET /api/attendance/monthly/:employeeId
// @access  Private
const getMonthlyAttendance = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { month } = req.query;

    if (!month) {
      return res.status(400).json({
        success: false,
        message: 'Month parameter is required',
      });
    }

    const records = await Attendance.find({
      employeeId,
      date: { $regex: `^${month}` },
    });

    const stats = {
      present: 0,
      absent: 0,
      late: 0,
      halfDay: 0,
      leave: 0,
    };

    records.forEach(record => {
      const status = record.status.toLowerCase();
      if (stats[status] !== undefined) {
        stats[status]++;
      }
    });

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get Monthly Attendance Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch monthly attendance',
    });
  }
};

// @desc    Get daily report (HR only)
// @route   GET /api/attendance/daily-report
// @access  Private/HR_ADMIN
const getDailyReport = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required',
      });
    }

    const result = await Attendance.getDailyReport(date);

    if (result.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          halfDay: 0,
          leave: 0,
        },
      });
    }

    const stats = result[0];
    res.status(200).json({
      success: true,
      data: {
        total: stats.total || 0,
        present: stats.present || 0,
        absent: stats.absent || 0,
        late: stats.late || 0,
        halfDay: stats.halfDay || 0,
        leave: stats.leave || 0,
      },
    });
  } catch (error) {
    console.error('Get Daily Report Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch daily report',
    });
  }
};

// @desc    Get attendance analytics (HR only)
// @route   GET /api/attendance/analytics
// @access  Private/HR_ADMIN
const getAttendanceAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required',
      });
    }

    const dailyData = await Attendance.getAnalytics(startDate, endDate);

    // Calculate summary
    const summary = {
      totalDays: dailyData.length,
      presentDays: 0,
      absentDays: 0,
      lateDays: 0,
      halfDayDays: 0,
      leaveDays: 0,
    };

    const formattedData = dailyData.map(item => ({
      date: item._id,
      present: item.present || 0,
      absent: item.absent || 0,
      late: item.late || 0,
      halfDay: item.halfDay || 0,
      leave: item.leave || 0,
    }));

    // Calculate summary totals
    formattedData.forEach(item => {
      summary.presentDays += item.present;
      summary.absentDays += item.absent;
      summary.lateDays += item.late;
      summary.halfDayDays += item.halfDay;
      summary.leaveDays += item.leave;
    });

    res.status(200).json({
      success: true,
      data: {
        daily: formattedData,
        summary,
      },
    });
  } catch (error) {
    console.error('Get Attendance Analytics Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
    });
  }
};

// @desc    Mark attendance for employee (HR only)
// @route   POST /api/attendance/mark
// @access  Private/HR_ADMIN
const markAttendance = async (req, res) => {
  try {
    const { employeeId, date, status, notes } = req.body;

    if (!employeeId || !date || !status) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID, date, and status are required',
      });
    }

    // Verify user exists
    const user = await User.findOne({ employeeId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Validate status
    const validStatuses = ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'LEAVE'];
    if (!validStatuses.includes(status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    let attendance = await Attendance.findOne({ employeeId, date });

    if (attendance) {
      attendance.status = status.toUpperCase();
      attendance.notes = notes || attendance.notes;
      attendance.updatedAt = Date.now();
      await attendance.save();
    } else {
      attendance = await Attendance.create({
        employeeId,
        employeeName: user.name,
        date,
        status: status.toUpperCase(),
        notes: notes || '',
      });
    }

    res.status(200).json({
      success: true,
      data: attendance,
      message: 'Attendance marked successfully',
    });
  } catch (error) {
    console.error('Mark Attendance Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark attendance',
    });
  }
};


// @desc    Get attendance by date (HR only)
// @route   GET /api/attendance/by-date
// @access  Private/HR_ADMIN
const getAttendanceByDate = async (req, res) => {
  try {
    const { date, employeeId } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required',
      });
    }

    let query = { date };
    if (employeeId) {
      query.employeeId = employeeId;
    }

    const records = await Attendance.find(query);

    res.status(200).json({
      success: true,
      data: records,
    });
  } catch (error) {
    console.error('Get Attendance By Date Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance records',
    });
  }
};

// @desc    Get weekly attendance
// @route   GET /api/attendance/weekly/:employeeId
// @access  Private
const getWeeklyAttendance = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { weekStart } = req.query;

    if (!weekStart) {
      return res.status(400).json({
        success: false,
        message: 'Week start date is required',
      });
    }

    // Calculate week end (7 days later)
    const startDate = new Date(weekStart);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const records = await Attendance.find({
      employeeId,
      date: {
        $gte: startStr,
        $lt: endStr,
      },
    }).sort({ date: 1 });

    // Generate full week data with empty days
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];
      
      const record = records.find(r => r.date === dateStr);
      weekDays.push({
        date: dateStr,
        day: currentDate.toLocaleDateString('en-US', { weekday: 'short' }),
        checkInTime: record?.checkInTime || null,
        checkOutTime: record?.checkOutTime || null,
        status: record?.status || 'ABSENT',
        workingHours: record?.workingHours || 0,
      });
    }

    res.status(200).json({
      success: true,
      data: weekDays,
    });
  } catch (error) {
    console.error('Get Weekly Attendance Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch weekly attendance',
    });
  }
};

// @desc    Get attendance stats for a month
// @route   GET /api/attendance/stats
// @access  Private/HR_ADMIN
const getAttendanceStats = async (req, res) => {
  try {
    const { month } = req.query;

    if (!month) {
      return res.status(400).json({
        success: false,
        message: 'Month is required',
      });
    }

    const records = await Attendance.find({
      date: { $regex: `^${month}` },
    });

    const stats = {
      total: records.length,
      present: records.filter(r => r.status === 'PRESENT').length,
      absent: records.filter(r => r.status === 'ABSENT').length,
      late: records.filter(r => r.status === 'LATE').length,
      halfDay: records.filter(r => r.status === 'HALF_DAY').length,
      leave: records.filter(r => r.status === 'LEAVE').length,
    };

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get Attendance Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance stats',
    });
  }
};

// @desc    Bulk attendance submission (HR only)
// @route   POST /api/attendance/bulk
// @access  Private/HR_ADMIN
const bulkAttendance = async (req, res) => {
  try {
    const { attendance } = req.body;

    if (!attendance || !Array.isArray(attendance) || attendance.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Attendance data is required',
      });
    }

    const results = [];
    for (const record of attendance) {
      const { employeeId, date, status, checkInTime, checkOutTime, notes } = record;

      // Check if employee exists
      const employee = await User.findOne({ employeeId });
      if (!employee) {
        results.push({ employeeId, success: false, message: 'Employee not found' });
        continue;
      }

      // Check if record already exists
      let existingRecord = await Attendance.findOne({ employeeId, date });

      if (existingRecord) {
        // Update existing record
        existingRecord.status = status || existingRecord.status;
        existingRecord.checkInTime = checkInTime || existingRecord.checkInTime;
        existingRecord.checkOutTime = checkOutTime || existingRecord.checkOutTime;
        existingRecord.notes = notes || existingRecord.notes;
        existingRecord.updatedAt = Date.now();
        await existingRecord.save();
        results.push({ employeeId, success: true, message: 'Updated successfully' });
      } else {
        // Create new record
        const newRecord = new Attendance({
          employeeId,
          employeeName: employee.name,
          date,
          checkInTime,
          checkOutTime,
          status: status || 'ABSENT',
          notes,
          createdAt: Date.now(),
        });
        await newRecord.save();
        results.push({ employeeId, success: true, message: 'Created successfully' });
      }
    }

    res.status(200).json({
      success: true,
      data: results,
      message: `Processed ${attendance.length} records`,
    });
  } catch (error) {
    console.error('Bulk Attendance Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process bulk attendance',
    });
  }
};

// @desc    Get present employees for a date (HR only)
// @route   GET /api/attendance/present
// @access  Private/HR_ADMIN
const getPresentEmployees = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required',
      });
    }

    const records = await Attendance.find({
      date,
      status: { $in: ['PRESENT', 'LATE'] },
    });

    const employeeIds = records.map(r => r.employeeId);
    const employees = await User.find({
      employeeId: { $in: employeeIds },
    }).select('employeeId name email department');

    res.status(200).json({
      success: true,
      data: employees,
      count: employees.length,
    });
  } catch (error) {
    console.error('Get Present Employees Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch present employees',
    });
  }
};

// @desc    Get absent employees for a date (HR only)
// @route   GET /api/attendance/absent
// @access  Private/HR_ADMIN
const getAbsentEmployees = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required',
      });
    }

    // Get all employees
    const allEmployees = await User.find({ role: 'EMPLOYEE' }).select('employeeId name email department');

    // Get present employees
    const presentRecords = await Attendance.find({
      date,
      status: { $in: ['PRESENT', 'LATE'] },
    });
    const presentEmployeeIds = presentRecords.map(r => r.employeeId);

    // Filter absent employees
    const absentEmployees = allEmployees.filter(
      emp => !presentEmployeeIds.includes(emp.employeeId)
    );

    res.status(200).json({
      success: true,
      data: absentEmployees,
      count: absentEmployees.length,
    });
  } catch (error) {
    console.error('Get Absent Employees Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch absent employees',
    });
  }
};

// @desc    Get late arrivals for a date (HR only)
// @route   GET /api/attendance/late
// @access  Private/HR_ADMIN
const getLateArrivals = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required',
      });
    }

    const records = await Attendance.find({
      date,
      status: 'LATE',
    });

    const employeeIds = records.map(r => r.employeeId);
    const employees = await User.find({
      employeeId: { $in: employeeIds },
    }).select('employeeId name email department');

    // Merge employee data with attendance records
    const result = employees.map(emp => {
      const record = records.find(r => r.employeeId === emp.employeeId);
      return {
        ...emp.toObject(),
        checkInTime: record?.checkInTime,
        checkOutTime: record?.checkOutTime,
        lateMinutes: record?.lateMinutes || 0,
      };
    });

    res.status(200).json({
      success: true,
      data: result,
      count: result.length,
    });
  } catch (error) {
    console.error('Get Late Arrivals Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch late arrivals',
    });
  }
};

// @desc    Get dashboard stats
// @route   GET /api/attendance/dashboard-stats
// @access  Private
const getDashboardStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get today's attendance
    const todayRecords = await Attendance.find({ date: today });
    
    const total = await User.countDocuments({ role: 'EMPLOYEE', isActive: true });
    const present = todayRecords.filter(r => r.status === 'PRESENT').length;
    const late = todayRecords.filter(r => r.status === 'LATE').length;
    const absent = total - todayRecords.length;

    // Get current month stats
    const currentMonth = today.substring(0, 7);
    const monthRecords = await Attendance.find({
      date: { $regex: `^${currentMonth}` },
    });

    const monthStats = {
      total: monthRecords.length,
      present: monthRecords.filter(r => r.status === 'PRESENT').length,
      absent: monthRecords.filter(r => r.status === 'ABSENT').length,
      late: monthRecords.filter(r => r.status === 'LATE').length,
      halfDay: monthRecords.filter(r => r.status === 'HALF_DAY').length,
      leave: monthRecords.filter(r => r.status === 'LEAVE').length,
    };

    res.status(200).json({
      success: true,
      data: {
        today: {
          total,
          present,
          absent,
          late,
          attendanceRate: total > 0 ? Math.round((present / total) * 100) : 0,
        },
        month: monthStats,
      },
    });
  } catch (error) {
    console.error('Get Dashboard Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats',
    });
  }
};


module.exports = {
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
};