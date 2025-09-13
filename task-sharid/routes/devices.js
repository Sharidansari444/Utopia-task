const express = require('express');
const Device = require('../models/Device');
const Telemetry = require('../models/Telemetry');
const { auth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/devices
// @desc    Get all devices with their latest readings
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50, search, status } = req.query;
    
    // Build query for initial device search
    let query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { uid: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Get ALL devices that match search criteria (no pagination yet)
    const allDevices = await Device.find(query)
      .sort({ lastSeen: -1 })
      .lean();

    // Get latest telemetry for each device
    const devicesWithTelemetry = await Promise.all(
      allDevices.map(async (device) => {
        const latestTelemetry = await Telemetry.getLatestByDevice(device.uid);
        return {
          ...device,
          latestReading: latestTelemetry ? latestTelemetry.toAPIResponse() : null
        };
      })
    );

    // Helper function to determine device status
    const getDeviceStatus = (device) => {
      if (!device.latestReading) return 'offline';
      
      const lastSeen = new Date(device.lastSeen || device.latestReading.timestamp);
      const now = new Date();
      const minutesAgo = (now - lastSeen) / (1000 * 60);
      
      if (minutesAgo < 5) return 'online';
      if (minutesAgo < 30) return 'warning';
      return 'offline';
    };

    // Filter by status if provided
    let filteredDevices = devicesWithTelemetry;
    if (status && status !== 'all') {
      filteredDevices = devicesWithTelemetry.filter(device => {
        const deviceStatus = getDeviceStatus(device);
        return deviceStatus === status;
      });
    }

    // Apply pagination to filtered results
    const total = filteredDevices.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedDevices = filteredDevices.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        devices: paginatedDevices,
        pagination: {
          current: parseInt(page),
          pages: totalPages,
          total,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching devices'
    });
  }
});

// @route   GET /api/devices/:id
// @desc    Get single device by ID or UID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try to find by MongoDB _id first, then by uid
    let device = await Device.findById(id).lean();
    if (!device) {
      device = await Device.findOne({ uid: id }).lean();
    }

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    // Get latest telemetry
    const latestTelemetry = await Telemetry.getLatestByDevice(device.uid);

    res.json({
      success: true,
      data: {
        device: {
          ...device,
          latestReading: latestTelemetry ? latestTelemetry.toAPIResponse() : null
        }
      }
    });

  } catch (error) {
    console.error('Get device error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching device'
    });
  }
});

// @route   GET /api/devices/:id/data
// @desc    Get last 10 readings for a device
// @access  Private
router.get('/:id/data', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 10, page = 1 } = req.query;
    
    // Find device first
    let device = await Device.findById(id);
    if (!device) {
      device = await Device.findOne({ uid: id });
    }

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    // Get telemetry data with pagination
    const telemetryData = await Telemetry.find({ deviceId: device.uid })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    // Get total count
    const total = await Telemetry.countDocuments({ deviceId: device.uid });

    // Format response
    const formattedData = telemetryData.map(reading => ({
      id: reading._id,
      deviceId: reading.deviceId,
      uid: reading.uid,
      firmware: reading.firmware,
      tts: reading.tts,
      data: {
        temperature: parseFloat(reading.data.temperature.toFixed(2)),
        humidity: parseFloat(reading.data.humidity.toFixed(2)),
        pm25: parseFloat(reading.data.pm25.toFixed(2))
      },
      timestamp: reading.timestamp,
      receivedAt: reading.receivedAt
    }));

    res.json({
      success: true,
      data: {
        device: {
          id: device._id,
          uid: device.uid,
          name: device.name
        },
        readings: formattedData,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get device data error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching device data'
    });
  }
});

// @route   POST /api/devices
// @desc    Create or update a device
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { uid, name, location, deviceType } = req.body;

    if (!uid || !name) {
      return res.status(400).json({
        success: false,
        message: 'UID and name are required'
      });
    }

    // Check if device exists
    let device = await Device.findOne({ uid });
    
    if (device) {
      // Update existing device
      device.name = name;
      device.location = location || device.location;
      device.deviceType = deviceType || device.deviceType;
      device.lastSeen = new Date();
      await device.save();
    } else {
      // Create new device
      device = new Device({
        uid,
        name,
        location: location || 'Unknown',
        deviceType: deviceType || 'sensor'
      });
      await device.save();
    }

    res.json({
      success: true,
      message: device.isNew ? 'Device created successfully' : 'Device updated successfully',
      data: { device }
    });

  } catch (error) {
    console.error('Create/Update device error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating/updating device'
    });
  }
});

// @route   GET /api/devices/stats/summary
// @desc    Get device statistics summary
// @access  Private
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const totalDevices = await Device.countDocuments();
    const activeDevices = await Device.countDocuments({ isActive: true });
    const recentReadings = await Telemetry.countDocuments({
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    });

    res.json({
      success: true,
      data: {
        totalDevices,
        activeDevices,
        inactiveDevices: totalDevices - activeDevices,
        recentReadings
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching statistics'
    });
  }
});

module.exports = router;