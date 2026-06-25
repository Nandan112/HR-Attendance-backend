const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
//   employeeId: {
//     type: String,
//     required: [true, 'Employee ID is required'],
//     ref: 'User',
//   },
//   employeeName: {
//     type: String,
//     required: true,
//   },
//   date: {
//     type: String,
//     required: true,
//   },
//   checkInTime: {
//     type: String,
//   },
//   checkOutTime: {
//     type: String,
//   },
//   status: {
//     type: String,
//     enum: ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'LEAVE'],
//     default: 'ABSENT',
//   },
//   location: {
//     type: String,
//   },
//   latitude: {
//     type: String,
//   },
//   longitude: {
//     type: String,
//   },
//   photoUrl: {
//     type: String,
//   },
//   checkInNotes: {
//     type: String,
//   },
//   checkOutNotes: {
//     type: String,
//   },
//   checkInLocation: {
//     type: String,
//   },
//   checkOutLocation: {
//     type: String,
//   },
//   workingHours: {
//     type: Number,
//     default: 0,
//   },
//   isLate: {
//     type: Boolean,
//     default: false,
//   },
//   lateMinutes: {
//     type: Number,
//     default: 0,
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now,
//   },
//   updatedAt: {
//     type: Date,
//     default: Date.now,
//   },
// });

employeeId: {
    type: String,
    required: true,
    trim: true,
  },
  employeeName: {
    type: String,
    required: true,
    trim: true,
  },
  date: {
    type: String,
    required: true,
  },
  checkInTime: {
    type: String,
    default: null,
  },
  checkOutTime: {
    type: String,
    default: null,
  },
  status: {
    type: String,
    enum: ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'LEAVE'],
    default: 'ABSENT',
  },
  checkInLocation: {
    type: String,
    default: null,
  },
  checkOutLocation: {
    type: String,
    default: null,
  },
  photoUrl: {
    type: String,
    default: null,
  },
  latitude: {
    type: String,
    default: null,
  },
  longitude: {
    type: String,
    default: null,
  },
  workingHours: {
    type: Number,
    default: 0,
  },
  lateMinutes: {
    type: Number,
    default: 0,
  },
  notes: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster queries
attendanceSchema.index({ employeeId: 1, date: 1 });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ status: 1 });

// Static method to get today's attendance for an employee
attendanceSchema.statics.getTodayAttendance = function (employeeId) {
  const today = new Date().toISOString().split('T')[0];
  return this.findOne({ employeeId, date: today });
};

// Static method to get monthly attendance
attendanceSchema.statics.getMonthlyAttendance = function (employeeId, month) {
  return this.find({
    employeeId,
    date: { $regex: `^${month}` },
  });
};

// Static method to get daily report
attendanceSchema.statics.getDailyReport = function (date) {
  return this.aggregate([
    { $match: { date } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        present: {
          $sum: { $cond: [{ $eq: ['$status', 'PRESENT'] }, 1, 0] },
        },
        absent: {
          $sum: { $cond: [{ $eq: ['$status', 'ABSENT'] }, 1, 0] },
        },
        late: {
          $sum: { $cond: [{ $eq: ['$status', 'LATE'] }, 1, 0] },
        },
        halfDay: {
          $sum: { $cond: [{ $eq: ['$status', 'HALF_DAY'] }, 1, 0] },
        },
        leave: {
          $sum: { $cond: [{ $eq: ['$status', 'LEAVE'] }, 1, 0] },
        },
      },
    },
  ]);
};

// Static method to get attendance analytics
attendanceSchema.statics.getAnalytics = function (startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        date: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $group: {
        _id: '$date',
        present: {
          $sum: { $cond: [{ $eq: ['$status', 'PRESENT'] }, 1, 0] },
        },
        absent: {
          $sum: { $cond: [{ $eq: ['$status', 'ABSENT'] }, 1, 0] },
        },
        late: {
          $sum: { $cond: [{ $eq: ['$status', 'LATE'] }, 1, 0] },
        },
        halfDay: {
          $sum: { $cond: [{ $eq: ['$status', 'HALF_DAY'] }, 1, 0] },
        },
        leave: {
          $sum: { $cond: [{ $eq: ['$status', 'LEAVE'] }, 1, 0] },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;