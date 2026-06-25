const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// @desc    Send reset password email
const sendResetPasswordEmail = async (email, name, resetUrl) => {
  try {
    const mailOptions = {
      from: `"HR Attendance System" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Password</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1a2332; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>HR Attendance System</h2>
          </div>
          <div class="content">
            <h3>Hello ${name},</h3>
            <p>We received a request to reset your password for the HR Attendance System.</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            <p>This link will expire in 1 hour.</p>
            <p>If you did not request this, please ignore this email.</p>
            <hr>
            <p style="font-size: 14px; color: #666;">
              <strong>Security Notice:</strong> Never share this link with anyone.
            </p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} HR Attendance System. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 Reset password email sent to ${email}`);
  } catch (error) {
    console.error('Email Send Error:', error);
    throw new Error('Failed to send email');
  }
};

// @desc    Send attendance notification email
const sendAttendanceNotification = async (email, name, type, time, date) => {
  try {
    const action = type === 'CHECK_IN' ? 'Checked In' : 'Checked Out';
    
    const mailOptions = {
      from: `"HR Attendance System" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `${action} Notification`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Attendance Notification</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${type === 'CHECK_IN' ? '#059669' : '#dc2626'}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${action} Successful</h2>
          </div>
          <div class="content">
            <h3>Hello ${name},</h3>
            <p>Your attendance has been recorded:</p>
            <ul>
              <li><strong>Action:</strong> ${action}</li>
              <li><strong>Date:</strong> ${date}</li>
              <li><strong>Time:</strong> ${time}</li>
            </ul>
            <p>Thank you for using the HR Attendance System.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} HR Attendance System. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 Attendance notification sent to ${email}`);
  } catch (error) {
    console.error('Email Send Error:', error);
    // Don't throw error for notifications, just log
  }
};

module.exports = {
  sendResetPasswordEmail,
  sendAttendanceNotification,
};