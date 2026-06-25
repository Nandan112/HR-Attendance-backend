const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
// const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./src/middleware/errorHandler');

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const attendanceRoutes = require('./src/routes/attendanceRoutes');
const employeeRoutes = require('./src/routes/employeeRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const Adminrouter = require('./src/routes/adminRoutes');

// Initialize express app
const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later.' }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api', limiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', Adminrouter);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/reports', reportRoutes);

// 404 handler
app.use((req, res) => res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` }));

// Error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

const startServer =  () => {
  try {
   mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');
    app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));
  } catch (error) {
    console.error('❌ MongoDB Error:');
    setTimeout(startServer, 5000);
  }
};

startServer();

// Process handlers
process.on('unhandledRejection', (err) => console.error('❌ Unhandled Rejection:', err));
process.on('uncaughtException', (err) => console.error('❌ Uncaught Exception:', err));
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received');
  mongoose.connection.close(() => process.exit(0));
});

module.exports = app;