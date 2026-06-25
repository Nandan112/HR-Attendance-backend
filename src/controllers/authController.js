const User = require('../models/User');
const Token = require('../models/Token');
const { generateToken } = require('../config/jwt');
const { sendResetPasswordEmail } = require('../utils/email');
const crypto = require('crypto');

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    console.log('Login attempt body:', req.body);
    const { employeeId, password } = req.body;

    if (!employeeId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide employee ID and password',
      });
    }

    const user = await User.findOne({ employeeId });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is disabled. Please contact HR.',
      });
    }

    const isPasswordMatch = await user.comparePassword(password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      data: {
        employeeId: user.employeeId,
        employeeName: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        phone: user.phone,
        profilePhoto: user.profilePhoto,
      },
      token,
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
    });
  }
};

// @desc    Register user (Only HR Admin)
// @route   POST /api/auth/register
// @access  Private/HR_ADMIN
const register = async (req, res) => {
  try {
    const { employeeId, name, email, password, role, department, phone } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ employeeId }, { email }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this employee ID or email already exists',
      });
    }

    const user = await User.create({
      employeeId,
      name,
      email,
      password,
      role: role || 'EMPLOYEE',
      department,
      phone,
    });

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      data: userResponse,
    });
  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { name, email, phone, department } = req.body;

    const user = await User.findByIdAndUpdate(
      req.userId,
      { name, email, phone, department, updatedAt: Date.now() },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
    });
  }
};

// @desc    Forgot password - send reset link
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { employeeId } = req.body;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide employee ID',
      });
    }

    const user = await User.findOne({ employeeId });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Save token to database
    await Token.create({
      userId: user._id,
      token: hashedToken,
      type: 'RESET_PASSWORD',
      expiresAt: new Date(Date.now() + 3600000), // 1 hour
    });

    // Send email
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    await sendResetPasswordEmail(user.email, user.name, resetUrl);

    res.status(200).json({
      success: true,
      message: 'Password reset link sent to your email',
    });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process request',
    });
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password/:token
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const resetToken = await Token.findOne({
      token: hashedToken,
      type: 'RESET_PASSWORD',
      expiresAt: { $gt: new Date() },
    });

    if (!resetToken) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token',
      });
    }

    const user = await User.findById(resetToken.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.password = password;
    user.updatedAt = Date.now();
    await user.save();

    // Delete the used token
    await Token.deleteOne({ _id: resetToken._id });

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password',
    });
  }
};

// @desc    Change password
// @route   POST /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters',
      });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const isPasswordMatch = await user.comparePassword(currentPassword);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    user.password = newPassword;
    user.updatedAt = Date.now();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change Password Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
    });
  }
};

// @desc    Logout user (client side handles token removal)
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};


module.exports = {
  login,
  register,
  getProfile,
  updateProfile,
  forgotPassword,
  resetPassword,
  changePassword,
  logout,
};