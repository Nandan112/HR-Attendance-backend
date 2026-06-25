    const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
//   employeeId: {
//     type: String,
//     required: [true, 'Employee ID is required'],
//     unique: true,
//     trim: true,
//   },
//   name: {
//     type: String,
//     required: [true, 'Name is required'],
//     trim: true,
//   },
//   email: {
//     type: String,
//     required: [true, 'Email is required'],
//     unique: true,
//     trim: true,
//     lowercase: true,
//   },
//   password: {
//     type: String,
//     required: [true, 'Password is required'],
//     minlength: 6,
//   },
//   role: {
//     type: String,
//     enum: ['EMPLOYEE', 'HR_ADMIN'],
//     default: 'EMPLOYEE',
//   },
//   department: {
//     type: String,
//     required: [true, 'Department is required'],
//     trim: true,
//   },
//   phone: {
//     type: String,
//     trim: true,
//   },
//   profilePhoto: {
//     type: String,
//     default: '',
//   },
//   isActive: {
//     type: Boolean,
//     default: true,
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
    unique: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  department: {
    type: String,
    required: true,
    trim: true,
  },
  position: {
    type: String,
    default: 'Employee',
  },
  phone: {
    type: String,
    default: '',
  },
  address: {
    type: String,
    default: '',
  },
  role: {
    type: String,
    enum: ['EMPLOYEE', 'HR_ADMIN', 'MANAGER'],
    default: 'EMPLOYEE',
  },
  isActive: {
    type: Boolean,
    default: true,
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

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  this.updatedAt = Date.now();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Static method to find by employee ID
userSchema.statics.findByEmployeeId = function (employeeId) {
  return this.findOne({ employeeId });
};

const User = mongoose.model('User', userSchema);

module.exports = User;