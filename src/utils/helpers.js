// @desc    Format date to YYYY-MM-DD
const formatDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// @desc    Format time to HH:MM:SS
const formatTime = (date) => {
  const d = new Date(date);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

// @desc    Calculate working hours between two times
const calculateWorkingHours = (startTime, endTime) => {
  const start = new Date(`1970-01-01T${startTime}`);
  const end = new Date(`1970-01-01T${endTime}`);
  const diff = (end - start) / (1000 * 60 * 60);
  return Math.round(diff * 100) / 100;
};

// @desc    Check if time is late (after 9:30 AM)
const isLate = (time, threshold = '09:30:00') => {
  const t = new Date(`1970-01-01T${time}`);
  const th = new Date(`1970-01-01T${threshold}`);
  return t > th;
};

// @desc    Get current month in YYYY-MM format
const getCurrentMonth = () => {
  return new Date().toISOString().slice(0, 7);
};

// @desc    Get days in month
const getDaysInMonth = (year, month) => {
  return new Date(year, month, 0).getDate();
};

module.exports = {
  formatDate,
  formatTime,
  calculateWorkingHours,
  isLate,
  getCurrentMonth,
  getDaysInMonth,
};