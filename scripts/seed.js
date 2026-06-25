const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Attendance = require('../src/models/Attendance');

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Attendance.deleteMany({});
    console.log('Cleared existing data');

    // Create HR Admin
    const admin = await User.create({
      employeeId: 'HR001',
      name: 'HR Admin',
      email: 'admin@hrsystem.com',
      password: 'Admin@123',
      role: 'HR_ADMIN',
      department: 'HR',
      phone: '9876543210',
      isActive: true,
    });
    console.log('HR Admin created:', admin.employeeId);

    // Create Employees
    const employees = [
      {
        employeeId: 'EMP001',
        name: 'John Doe',
        email: 'john.doe@company.com',
        password: 'Employee@123',
        department: 'Engineering',
        phone: '9876543201',
      },
      {
        employeeId: 'EMP002',
        name: 'Jane Smith',
        email: 'jane.smith@company.com',
        password: 'Employee@123',
        department: 'Marketing',
        phone: '9876543202',
      },
      {
        employeeId: 'EMP003',
        name: 'Bob Johnson',
        email: 'bob.johnson@company.com',
        password: 'Employee@123',
        department: 'Sales',
        phone: '9876543203',
      },
      {
        employeeId: 'EMP004',
        name: 'Alice Williams',
        email: 'alice.williams@company.com',
        password: 'Employee@123',
        department: 'Engineering',
        phone: '9876543204',
      },
      {
        employeeId: 'EMP005',
        name: 'Charlie Brown',
        email: 'charlie.brown@company.com',
        password: 'Employee@123',
        department: 'Finance',
        phone: '9876543205',
      },
    ];

    const createdEmployees = await User.insertMany(employees);
    console.log(`Created ${createdEmployees.length} employees`);

    // Create sample attendance records for current month
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const dateStr = date.toISOString().split('T')[0];
      
      // Skip weekends (Saturday=6, Sunday=0)
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      // Only create records for past days
      if (date > today) continue;

      for (const emp of createdEmployees) {
        // Randomly decide if employee was present (80% chance)
        const isPresent = Math.random() < 0.8;
        
        if (isPresent) {
          // Random check-in time between 9:00 and 10:00
          const hour = 9 + Math.floor(Math.random() * 2);
          const minute = Math.floor(Math.random() * 60);
          const checkInTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
          
          // Random check-out time between 17:00 and 18:30
          const outHour = 17 + Math.floor(Math.random() * 2);
          const outMinute = Math.floor(Math.random() * 60);
          const checkOutTime = `${String(outHour).padStart(2, '0')}:${String(outMinute).padStart(2, '0')}:00`;

          // Determine if late (after 9:30)
          const isLate = hour > 9 || (hour === 9 && minute > 30);
          const status = isLate ? 'LATE' : 'PRESENT';

          await Attendance.create({
            employeeId: emp.employeeId,
            employeeName: emp.name,
            date: dateStr,
            checkInTime,
            checkOutTime,
            status,
            location: 'Office, Mumbai',
            workingHours: 8 + (Math.random() * 0.5),
          });
        } else {
          // Absent
          await Attendance.create({
            employeeId: emp.employeeId,
            employeeName: emp.name,
            date: dateStr,
            status: 'ABSENT',
            location: 'N/A',
          });
        }
      }
    }

    console.log('Sample attendance records created');

    console.log('\n✅ Database seeded successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('HR Admin:');
    console.log('  Employee ID: HR001');
    console.log('  Password: Admin@123');
    console.log('\nEmployees:');
    console.log('  Employee ID: EMP001 to EMP005');
    console.log('  Password: Employee@123');

    process.exit(0);
  } catch (error) {
    console.error('Seed Error:', error);
    process.exit(1);
  }
};

seedDatabase();