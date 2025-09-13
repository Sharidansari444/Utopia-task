const mongoose = require('mongoose');
const User = require('../models/User');
const Device = require('../models/Device');
const Telemetry = require('../models/Telemetry');
require('dotenv').config();

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/iot-devices', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');

    // Create default admin user
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@iot.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    const existingAdmin = await User.findByEmail(adminEmail);
    
    if (!existingAdmin) {
      const adminUser = new User({
        email: adminEmail,
        password: adminPassword,
        name: 'System Administrator',
        role: 'admin'
      });
      
      await adminUser.save();
      console.log(`✅ Created admin user: ${adminEmail}`);
    } else {
      console.log(`ℹ️ Admin user already exists: ${adminEmail}`);
    }

    // Create sample regular user
    const userEmail = 'user@iot.com';
    const existingUser = await User.findByEmail(userEmail);
    
    if (!existingUser) {
      const regularUser = new User({
        email: userEmail,
        password: 'user123',
        name: 'Regular User',
        role: 'user'
      });
      
      await regularUser.save();
      console.log(`✅ Created regular user: ${userEmail}`);
    } else {
      console.log(`ℹ️ Regular user already exists: ${userEmail}`);
    }

    // Create sample devices
    const sampleDevices = [
      {
        uid: 'device-001',
        name: 'Living Room Sensor',
        location: 'Living Room',
        deviceType: 'environmental'
      },
      {
        uid: 'device-002',
        name: 'Bedroom Sensor',
        location: 'Bedroom',
        deviceType: 'environmental'
      },
      {
        uid: 'device-003',
        name: 'Kitchen Sensor',
        location: 'Kitchen',
        deviceType: 'environmental'
      }
    ];

    for (const deviceData of sampleDevices) {
      const existingDevice = await Device.findOne({ uid: deviceData.uid });
      
      if (!existingDevice) {
        const device = new Device(deviceData);
        await device.save();
        console.log(`✅ Created sample device: ${deviceData.name}`);
        
        // Create sample telemetry data for each device
        const sampleReadings = [];
        const now = new Date();
        
        for (let i = 0; i < 10; i++) {
          const timestamp = new Date(now.getTime() - (i * 5 * 60 * 1000)); // Every 5 minutes
          
          sampleReadings.push({
            deviceId: deviceData.uid,
            uid: deviceData.uid,
            firmware: '1.0.0',
            tts: Math.floor(timestamp.getTime() / 1000),
            data: {
              temperature: parseFloat((20 + Math.random() * 10).toFixed(2)), // 20-30°C
              humidity: parseFloat((40 + Math.random() * 40).toFixed(2)), // 40-80%
              pm25: parseFloat((Math.random() * 50).toFixed(2)) // 0-50 μg/m³
            },
            timestamp: timestamp,
            receivedAt: timestamp
          });
        }
        
        await Telemetry.insertMany(sampleReadings);
        console.log(`✅ Created sample telemetry data for ${deviceData.name}`);
      } else {
        console.log(`ℹ️ Device already exists: ${deviceData.name}`);
      }
    }

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📋 Login Credentials:');
    console.log(`   Admin: ${adminEmail} / ${adminPassword}`);
    console.log(`   User:  ${userEmail} / user123`);
    console.log('\n🚀 You can now start the server with: npm run dev');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
}

// Run the seeder
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;