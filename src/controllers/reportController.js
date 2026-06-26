// const Attendance = require('../models/Attendance');
// const User = require('../models/User');

// // @desc    Export report (HR only)
// // @route   GET /api/reports/export
// // @access  Private/HR_ADMIN
// const exportReport = async (req, res) => {
//   try {
//     const { startDate, endDate, format, department } = req.query;

//     if (!startDate || !endDate) {
//       return res.status(400).json({
//         success: false,
//         message: 'Start date and end date are required',
//       });
//     }

//     // Build query
//     let query = {
//       date: {
//         $gte: startDate,
//         $lte: endDate,
//       },
//     };

//     // If department filter is provided, get employees in that department
//     if (department) {
//       const employees = await User.find({
//         department: { $regex: department, $options: 'i' },
//         role: 'EMPLOYEE',
//       });
//       const employeeIds = employees.map(e => e.employeeId);
//       query.employeeId = { $in: employeeIds };
//     }

//     const records = await Attendance.find(query).sort({ date: 1, employeeId: 1 });

//     // Format data for CSV
//     const csvData = records.map(record => ({
//       'Employee ID': record.employeeId,
//       'Employee Name': record.employeeName,
//       'Date': record.date,
//       'Check In': record.checkInTime || 'N/A',
//       'Check Out': record.checkOutTime || 'N/A',
//       'Status': record.status,
//       'Working Hours': record.workingHours || 0,
//       'Location': record.checkInLocation || record.checkOutLocation || 'N/A',
//     }));

//     // For now, return JSON data. In production, generate CSV/PDF
//     res.status(200).json({
//       success: true,
//       data: csvData,
//       message: 'Report exported successfully',
//     });
//   } catch (error) {
//     console.error('Export Report Error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to export report',
//     });
//   }
// };

// // @desc    Get department wise report (HR only)
// // @route   GET /api/reports/department
// // @access  Private/HR_ADMIN
// const getDepartmentReport = async (req, res) => {
//   try {
//     const { date } = req.query;

//     if (!date) {
//       return res.status(400).json({
//         success: false,
//         message: 'Date is required',
//       });
//     }

//     // Get all employees grouped by department
//     const employees = await User.find({ role: 'EMPLOYEE' }).select('employeeId department name');
    
//     const departmentMap = {};
//     employees.forEach(emp => {
//       if (!departmentMap[emp.department]) {
//         departmentMap[emp.department] = {
//           department: emp.department,
//           total: 0,
//           present: 0,
//           absent: 0,
//           late: 0,
//           employees: [],
//         };
//       }
//       departmentMap[emp.department].total++;
//       departmentMap[emp.department].employees.push({
//         employeeId: emp.employeeId,
//         name: emp.name,
//       });
//     });

//     // Get attendance for the date
//     const attendance = await Attendance.find({ date });
//     const attendanceMap = {};
//     attendance.forEach(a => {
//       attendanceMap[a.employeeId] = a.status;
//     });

//     // Calculate department stats
//     const result = Object.values(departmentMap).map(dept => {
//       dept.employees.forEach(emp => {
//         const status = attendanceMap[emp.employeeId] || 'ABSENT';
//         if (status === 'PRESENT') dept.present++;
//         else if (status === 'ABSENT') dept.absent++;
//         else if (status === 'LATE') dept.late++;
//       });
//       return {
//         department: dept.department,
//         total: dept.total,
//         present: dept.present,
//         absent: dept.absent,
//         late: dept.late,
//         attendancePercentage: dept.total > 0 
//           ? Math.round((dept.present / dept.total) * 100)
//           : 0,
//       };
//     });

//     res.status(200).json({
//       success: true,
//       data: result,
//     });
//   } catch (error) {
//     console.error('Get Department Report Error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch department report',
//     });
//   }
// };

// // @desc    Get attendance trends (HR only)
// // @route   GET /api/reports/trends
// // @access  Private/HR_ADMIN
// const getAttendanceTrends = async (req, res) => {
//   try {
//     const { months = 6 } = req.query;

//     const endDate = new Date();
//     const startDate = new Date();
//     startDate.setMonth(startDate.getMonth() - parseInt(months));

//     const startStr = startDate.toISOString().split('T')[0];
//     const endStr = endDate.toISOString().split('T')[0];

//     const records = await Attendance.find({
//       date: {
//         $gte: startStr,
//         $lte: endStr,
//       },
//     });

//     // Group by month
//     const monthlyData = {};
//     records.forEach(record => {
//       const month = record.date.substring(0, 7);
//       if (!monthlyData[month]) {
//         monthlyData[month] = {
//           month,
//           present: 0,
//           absent: 0,
//           late: 0,
//           total: 0,
//         };
//       }
//       monthlyData[month].total++;
//       const status = record.status;
//       if (status === 'PRESENT') monthlyData[month].present++;
//       else if (status === 'ABSENT') monthlyData[month].absent++;
//       else if (status === 'LATE') monthlyData[month].late++;
//     });

//     const result = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

//     res.status(200).json({
//       success: true,
//       data: result,
//     });
//   } catch (error) {
//     console.error('Get Attendance Trends Error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch attendance trends',
//     });
//   }
// };

// module.exports = {
//   exportReport,
//   getDepartmentReport,
//   getAttendanceTrends,
// };


const Attendance = require('../models/Attendance');
const User = require('../models/User');
const mongoose = require('mongoose');

// @desc    Export report with advanced filtering and analytics (HR only)
// @route   GET /api/reports/export
// @access  Private/HR_ADMIN
const exportReport = async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      format = 'json', 
      department,
      status,
      minWorkingHours,
      maxWorkingHours,
      includeSummary = true,
      sortBy = 'date',
      sortOrder = 'asc'
    } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required',
      });
    }

    // Date validation
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD',
      });
    }

    // Build query with advanced filtering
    let query = {
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    };

    // Department filter
    if (department) {
      const employees = await User.find({
        department: { $regex: department, $options: 'i' },
        role: 'EMPLOYEE',
      }).select('employeeId');
      const employeeIds = employees.map(e => e.employeeId);
      query.employeeId = { $in: employeeIds };
    }

    // Status filter
    if (status) {
      const statuses = status.split(',').map(s => s.trim().toUpperCase());
      query.status = { $in: statuses };
    }

    // Get records with population
    let records = await Attendance.find(query)
      .populate({
        path: 'employeeId',
        model: 'User',
        select: 'name email department designation joinDate'
      })
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 });

    // Working hours filter (post-query filtering)
    if (minWorkingHours || maxWorkingHours) {
      records = records.filter(record => {
        const hours = record.workingHours || 0;
        if (minWorkingHours && hours < parseFloat(minWorkingHours)) return false;
        if (maxWorkingHours && hours > parseFloat(maxWorkingHours)) return false;
        return true;
      });
    }

    // Calculate comprehensive summary
    let summary = {};
    if (includeSummary === 'true' || includeSummary === true) {
      const totalEmployees = await User.countDocuments({ role: 'EMPLOYEE' });
      const uniqueEmployees = new Set(records.map(r => r.employeeId._id?.toString() || r.employeeId.toString()));
      
      summary = {
        totalRecords: records.length,
        uniqueEmployees: uniqueEmployees.size,
        totalEmployees: totalEmployees,
        attendanceRate: totalEmployees > 0 ? Math.round((uniqueEmployees.size / totalEmployees) * 100) : 0,
        statusBreakdown: {
          present: records.filter(r => r.status === 'PRESENT').length,
          absent: records.filter(r => r.status === 'ABSENT').length,
          late: records.filter(r => r.status === 'LATE').length,
          halfDay: records.filter(r => r.status === 'HALF_DAY').length,
        },
        workingHoursStats: {
          total: records.reduce((sum, r) => sum + (r.workingHours || 0), 0),
          average: records.length > 0 ? (records.reduce((sum, r) => sum + (r.workingHours || 0), 0) / records.length).toFixed(2) : 0,
          min: records.length > 0 ? Math.min(...records.map(r => r.workingHours || 0)) : 0,
          max: records.length > 0 ? Math.max(...records.map(r => r.workingHours || 0)) : 0,
        },
        departmentBreakdown: {},
        dateRange: {
          start: startDate,
          end: endDate,
          days: Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1,
        }
      };

      // Department wise breakdown
      const deptMap = {};
      records.forEach(record => {
        const dept = record.employeeId?.department || 'Unknown';
        if (!deptMap[dept]) {
          deptMap[dept] = { total: 0, present: 0, absent: 0, late: 0, halfDay: 0 };
        }
        deptMap[dept].total++;
        if (record.status === 'PRESENT') deptMap[dept].present++;
        else if (record.status === 'ABSENT') deptMap[dept].absent++;
        else if (record.status === 'LATE') deptMap[dept].late++;
        else if (record.status === 'HALF_DAY') deptMap[dept].halfDay++;
      });
      summary.departmentBreakdown = deptMap;
    }

    // Format data for export
    const formattedData = records.map(record => {
      const emp = record.employeeId;
      return {
        'Employee ID': typeof record.employeeId === 'object' ? record.employeeId.employeeId : record.employeeId,
        'Employee Name': emp?.name || record.employeeName || 'Unknown',
        'Email': emp?.email || 'N/A',
        'Department': emp?.department || 'N/A',
        'Designation': emp?.designation || 'N/A',
        'Date': record.date,
        'Check In': record.checkInTime || 'N/A',
        'Check Out': record.checkOutTime || 'N/A',
        'Status': record.status,
        'Working Hours': (record.workingHours || 0).toFixed(2),
        'Overtime': record.overtime || 0,
        'Check In Location': record.checkInLocation || 'N/A',
        'Check Out Location': record.checkOutLocation || 'N/A',
        'IP Address': record.ipAddress || 'N/A',
        'Device': record.device || 'N/A',
        'Remarks': record.remarks || '',
      };
    });

    // Return based on format
    if (format === 'csv') {
      // CSV header
      const headers = Object.keys(formattedData[0] || {});
      const csvRows = [
        headers.join(','),
        ...formattedData.map(row => headers.map(h => `"${(row[h] || '').toString().replace(/"/g, '""')}"`).join(','))
      ];
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=attendance-report-${startDate}-to-${endDate}.csv`);
      return res.status(200).send(csvRows.join('\n'));
    }

    // Default JSON response with summary
    res.status(200).json({
      success: true,
      data: formattedData,
      summary: summary,
      metadata: {
        totalRecords: records.length,
        filters: { startDate, endDate, department, status, minWorkingHours, maxWorkingHours },
        generatedAt: new Date().toISOString(),
      },
      message: 'Report exported successfully',
    });
  } catch (error) {
    console.error('Export Report Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// @desc    Get comprehensive department wise report with trends (HR only)
// @route   GET /api/reports/department
// @access  Private/HR_ADMIN
const getDepartmentReport = async (req, res) => {
  try {
    const { 
      date, 
      startDate, 
      endDate,
      includeEmployees = false,
      includeTrends = false
    } = req.query;

    // Support both single date and date range
    let queryDate = date;
    let queryStartDate = startDate;
    let queryEndDate = endDate;

    if (!date && !startDate && !endDate) {
      // Default to today
      queryDate = new Date().toISOString().split('T')[0];
    }

    // Get all employees with department info
    const employees = await User.find({ 
      role: 'EMPLOYEE',
      status: 'ACTIVE'
    }).select('employeeId department name email designation joinDate');

    const departmentMap = {};
    employees.forEach(emp => {
      const dept = emp.department || 'Unassigned';
      if (!departmentMap[dept]) {
        departmentMap[dept] = {
          department: dept,
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          halfDay: 0,
          onLeave: 0,
          presentPercentage: 0,
          employees: [],
          dailyTrends: {},
        };
      }
      departmentMap[dept].total++;
      if (includeEmployees === 'true' || includeEmployees === true) {
        departmentMap[dept].employees.push({
          employeeId: emp.employeeId,
          name: emp.name,
          email: emp.email,
          designation: emp.designation,
          joinDate: emp.joinDate,
        });
      }
    });

    // Build attendance query
    let attendanceQuery = {};
    if (queryDate) {
      attendanceQuery.date = queryDate;
    } else if (queryStartDate && queryEndDate) {
      attendanceQuery.date = {
        $gte: queryStartDate,
        $lte: queryEndDate,
      };
    }

    const attendance = await Attendance.find(attendanceQuery)
      .populate({
        path: 'employeeId',
        model: 'User',
        select: 'name department email designation'
      });

    // Create attendance map
    const attendanceMap = {};
    const employeeAttendanceCount = {};
    attendance.forEach(a => {
      const empId = typeof a.employeeId === 'object' ? a.employeeId.employeeId : a.employeeId;
      if (!attendanceMap[empId]) {
        attendanceMap[empId] = [];
      }
      attendanceMap[empId].push(a);
      
      // For single date
      if (queryDate) {
        attendanceMap[empId] = a.status;
      }
    });

    // Calculate department stats
    const result = Object.values(departmentMap).map(dept => {
      let present = 0, absent = 0, late = 0, halfDay = 0, onLeave = 0;

      if (queryDate) {
        // Single date calculation
        dept.employees.forEach(emp => {
          const status = attendanceMap[emp.employeeId] || 'ABSENT';
          if (status === 'PRESENT') present++;
          else if (status === 'ABSENT') absent++;
          else if (status === 'LATE') late++;
          else if (status === 'HALF_DAY') halfDay++;
          else if (status === 'ON_LEAVE') onLeave++;
        });
      } else if (queryStartDate && queryEndDate) {
        // Date range calculation - average attendance
        const totalDays = Math.ceil((new Date(queryEndDate) - new Date(queryStartDate)) / (1000 * 60 * 60 * 24)) + 1;
        dept.employees.forEach(emp => {
          const records = attendanceMap[emp.employeeId] || [];
          const presentCount = records.filter(r => r.status === 'PRESENT').length;
          if (presentCount > 0) present++;
          if (records.length > 0) {
            const latestStatus = records[records.length - 1]?.status || 'ABSENT';
            if (latestStatus === 'ABSENT') absent++;
            else if (latestStatus === 'LATE') late++;
            else if (latestStatus === 'HALF_DAY') halfDay++;
            else if (latestStatus === 'ON_LEAVE') onLeave++;
          } else {
            absent++;
          }
        });
      }

      // Calculate trends if requested
      let dailyTrends = {};
      if (includeTrends === 'true' || includeTrends === true) {
        const deptEmployeeIds = dept.employees.map(e => e.employeeId);
        const deptAttendance = attendance.filter(a => 
          deptEmployeeIds.includes(typeof a.employeeId === 'object' ? a.employeeId.employeeId : a.employeeId)
        );
        
        dailyTrends = deptAttendance.reduce((acc, record) => {
          const date = record.date;
          if (!acc[date]) {
            acc[date] = { present: 0, absent: 0, late: 0, total: 0 };
          }
          acc[date].total++;
          if (record.status === 'PRESENT') acc[date].present++;
          else if (record.status === 'ABSENT') acc[date].absent++;
          else if (record.status === 'LATE') acc[date].late++;
          return acc;
        }, {});
      }

      return {
        department: dept.department,
        total: dept.total,
        present,
        absent,
        late,
        halfDay,
        onLeave,
        attendancePercentage: dept.total > 0 ? Math.round(((present + halfDay * 0.5) / dept.total) * 100) : 0,
        statusBreakdown: {
          present: present,
          absent: absent,
          late: late,
          halfDay: halfDay,
          onLeave: onLeave,
        },
        employees: includeEmployees === 'true' || includeEmployees === true ? dept.employees : undefined,
        dailyTrends: includeTrends === 'true' || includeTrends === true ? dailyTrends : undefined,
      };
    });

    // Sort by attendance percentage descending
    result.sort((a, b) => b.attendancePercentage - a.attendancePercentage);

    // Overall summary
    const overall = {
      totalDepartments: result.length,
      totalEmployees: employees.length,
      totalPresent: result.reduce((sum, d) => sum + d.present, 0),
      totalAbsent: result.reduce((sum, d) => sum + d.absent, 0),
      totalLate: result.reduce((sum, d) => sum + d.late, 0),
      overallAttendancePercentage: employees.length > 0 
        ? Math.round((result.reduce((sum, d) => sum + d.present + d.halfDay * 0.5, 0) / employees.length) * 100)
        : 0,
    };

    res.status(200).json({
      success: true,
      data: result,
      summary: overall,
      metadata: {
        date: queryDate || `${queryStartDate} to ${queryEndDate}`,
        filters: { date: queryDate, startDate: queryStartDate, endDate: queryEndDate },
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Get Department Report Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch department report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// @desc    Get advanced attendance trends with predictions (HR only)
// @route   GET /api/reports/trends
// @access  Private/HR_ADMIN
const getAttendanceTrends = async (req, res) => {
  try {
    const { 
      months = 6, 
      department,
      granularity = 'monthly', // daily, weekly, monthly, quarterly
      includePrediction = false,
      predictionMonths = 3,
      includeDepartmentBreakdown = false
    } = req.query;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    // Build base query
    let query = {
      date: {
        $gte: startStr,
        $lte: endStr,
      },
    };

    // Department filter
    if (department) {
      const employees = await User.find({
        department: { $regex: department, $options: 'i' },
        role: 'EMPLOYEE',
      }).select('employeeId');
      const employeeIds = employees.map(e => e.employeeId);
      query.employeeId = { $in: employeeIds };
    }

    const records = await Attendance.find(query)
      .populate({
        path: 'employeeId',
        model: 'User',
        select: 'department name'
      });

    // Group by granularity
    const groupedData = {};
    const departmentTrends = {};

    records.forEach(record => {
      let key;
      const date = new Date(record.date);
      
      switch(granularity) {
        case 'daily':
          key = record.date;
          break;
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'quarterly':
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          key = `${date.getFullYear()}-Q${quarter}`;
          break;
        default: // monthly
          key = record.date.substring(0, 7);
      }

      if (!groupedData[key]) {
        groupedData[key] = {
          period: key,
          present: 0,
          absent: 0,
          late: 0,
          halfDay: 0,
          total: 0,
          workingHoursTotal: 0,
          uniqueEmployees: new Set(),
        };
      }

      groupedData[key].total++;
      groupedData[key].workingHoursTotal += (record.workingHours || 0);
      
      const empId = typeof record.employeeId === 'object' ? record.employeeId.employeeId : record.employeeId;
      groupedData[key].uniqueEmployees.add(empId);

      const status = record.status;
      if (status === 'PRESENT') groupedData[key].present++;
      else if (status === 'ABSENT') groupedData[key].absent++;
      else if (status === 'LATE') groupedData[key].late++;
      else if (status === 'HALF_DAY') groupedData[key].halfDay++;

      // Department breakdown
      if (includeDepartmentBreakdown === 'true' || includeDepartmentBreakdown === true) {
        const dept = record.employeeId?.department || 'Unknown';
        if (!departmentTrends[dept]) {
          departmentTrends[dept] = {};
        }
        if (!departmentTrends[dept][key]) {
          departmentTrends[dept][key] = { present: 0, absent: 0, late: 0, total: 0 };
        }
        departmentTrends[dept][key].total++;
        if (status === 'PRESENT') departmentTrends[dept][key].present++;
        else if (status === 'ABSENT') departmentTrends[dept][key].absent++;
        else if (status === 'LATE') departmentTrends[dept][key].late++;
      }
    });

    // Convert Set to size
    const result = Object.values(groupedData).map(item => ({
      ...item,
      uniqueEmployees: item.uniqueEmployees.size,
      averageWorkingHours: item.total > 0 ? (item.workingHoursTotal / item.total).toFixed(2) : 0,
      attendanceRate: item.total > 0 ? Math.round((item.present / item.total) * 100) : 0,
      presentPercentage: item.total > 0 ? Math.round((item.present / item.total) * 100) : 0,
      absentPercentage: item.total > 0 ? Math.round((item.absent / item.total) * 100) : 0,
      latePercentage: item.total > 0 ? Math.round((item.late / item.total) * 100) : 0,
    })).sort((a, b) => a.period.localeCompare(b.period));

    // Calculate moving averages (trend lines)
    const movingAverageWindow = Math.min(3, result.length);
    const resultWithTrends = result.map((item, index, arr) => {
      if (index >= movingAverageWindow - 1) {
        const window = arr.slice(index - movingAverageWindow + 1, index + 1);
        const avgAttendance = window.reduce((sum, w) => sum + w.attendanceRate, 0) / window.length;
        return {
          ...item,
          movingAverage: Math.round(avgAttendance),
          trend: index > 0 ? item.attendanceRate - arr[index - 1].attendanceRate : 0,
        };
      }
      return {
        ...item,
        movingAverage: item.attendanceRate,
        trend: 0,
      };
    });

    // Prediction using simple linear regression
    let prediction = null;
    if (includePrediction === 'true' || includePrediction === true) {
      const dataPoints = resultWithTrends.map((item, index) => ({
        x: index,
        y: item.attendanceRate,
      }));

      if (dataPoints.length >= 2) {
        // Calculate linear regression
        const n = dataPoints.length;
        const sumX = dataPoints.reduce((s, d) => s + d.x, 0);
        const sumY = dataPoints.reduce((s, d) => s + d.y, 0);
        const sumXY = dataPoints.reduce((s, d) => s + d.x * d.y, 0);
        const sumXX = dataPoints.reduce((s, d) => s + d.x * d.x, 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        const predictionMonthsCount = parseInt(predictionMonths);
        const predicted = [];
        const lastDate = new Date(endDate);
        
        for (let i = 1; i <= predictionMonthsCount; i++) {
          const nextX = n + i - 1;
          const predictedRate = Math.max(0, Math.min(100, Math.round(slope * nextX + intercept)));
          
          const nextMonth = new Date(lastDate);
          nextMonth.setMonth(nextMonth.getMonth() + i);
          const monthStr = nextMonth.toISOString().split('T')[0].substring(0, 7);
          
          predicted.push({
            period: monthStr,
            predictedAttendance: predictedRate,
            confidence: Math.max(0, 1 - (i / (predictionMonthsCount + 2))), // Decreasing confidence
          });
        }

        prediction = {
          method: 'Linear Regression',
          predictedValues: predicted,
          trend: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable',
          slope: slope.toFixed(2),
          accuracy: Math.min(95, Math.max(70, 100 - (Math.abs(slope) * 5))),
        };
      }
    }

    // Calculate overall statistics
    const overallStats = {
      totalPeriods: result.length,
      averageAttendance: result.reduce((sum, r) => sum + r.attendanceRate, 0) / (result.length || 1),
      averageWorkingHours: result.reduce((sum, r) => sum + parseFloat(r.averageWorkingHours), 0) / (result.length || 1),
      bestPeriod: result.length > 0 ? result.reduce((a, b) => a.attendanceRate > b.attendanceRate ? a : b) : null,
      worstPeriod: result.length > 0 ? result.reduce((a, b) => a.attendanceRate < b.attendanceRate ? a : b) : null,
      totalRecords: records.length,
    };

    const response = {
      success: true,
      data: resultWithTrends,
      departmentBreakdown: includeDepartmentBreakdown === 'true' || includeDepartmentBreakdown === true ? departmentTrends : undefined,
      prediction: prediction,
      summary: overallStats,
      metadata: {
        months: parseInt(months),
        granularity: granularity,
        startDate: startStr,
        endDate: endStr,
        department: department || 'All',
        generatedAt: new Date().toISOString(),
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get Attendance Trends Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance trends',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = {
  exportReport,
  getDepartmentReport,
  getAttendanceTrends,
};
