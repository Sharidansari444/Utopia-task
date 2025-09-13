const mqtt = require('mqtt');
const Device = require('../models/Device');
const Telemetry = require('../models/Telemetry');

class MQTTWorker {
  constructor() {
    this.client = null;
    this.io = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
  }

  start(socketIo) {
    this.io = socketIo;
    
    // Check if MQTT is enabled
    const mqttEnabled = process.env.MQTT_ENABLED !== 'false';
    if (!mqttEnabled) {
      console.log('📴 MQTT is disabled in configuration. Skipping MQTT connection.');
      return;
    }
    
    this.connect();
  }

  connect() {
    const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
    const options = {
      clientId: `iot-backend-${Math.random().toString(16).substr(2, 8)}`,
      clean: true,
      connectTimeout: 4000,
      username: process.env.MQTT_USERNAME || undefined,
      password: process.env.MQTT_PASSWORD || undefined,
      reconnectPeriod: 5000, // Increase reconnect period
    };

    console.log(`🔌 Attempting to connect to MQTT broker: ${brokerUrl}`);
    
    this.client = mqtt.connect(brokerUrl, options);

    this.client.on('connect', () => {
      console.log('✅ Connected to MQTT broker');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Subscribe to device telemetry topic
      this.client.subscribe('/application/out/+', (err) => {
        if (err) {
          console.error('❌ Failed to subscribe to MQTT topic:', err);
        } else {
          console.log('📡 Subscribed to /application/out/+');
        }
      });
    });

    this.client.on('message', async (topic, message) => {
      try {
        await this.handleMessage(topic, message);
      } catch (error) {
        console.error('❌ Error handling MQTT message:', error);
      }
    });

    this.client.on('error', (error) => {
      if (error.code === 'ECONNREFUSED') {
        console.warn('⚠️  MQTT broker not available at', brokerUrl);
        console.warn('   The application will continue without MQTT functionality.');
        console.warn('   To enable MQTT, please install and start a broker like Mosquitto.');
      } else {
        console.error('❌ MQTT connection error:', error);
      }
      this.isConnected = false;
    });

    this.client.on('close', () => {
      console.log('🔌 MQTT connection closed');
      this.isConnected = false;
    });

    this.client.on('reconnect', () => {
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.warn('⚠️  MQTT broker still not available after', this.maxReconnectAttempts, 'attempts.');
        console.warn('   Stopping reconnection attempts. Application will continue without MQTT.');
        this.client.end();
      } else if (this.reconnectAttempts <= 3) {
        console.log(`🔄 Attempting to reconnect to MQTT broker (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      }
    });

    this.client.on('offline', () => {
      console.log('📴 MQTT client is offline');
      this.isConnected = false;
    });
  }

  async handleMessage(topic, message) {
    try {
      // Extract device ID from topic: /application/out/<device_id>
      const topicParts = topic.split('/');
      if (topicParts.length !== 4 || topicParts[1] !== 'application' || topicParts[2] !== 'out') {
        console.warn(`⚠️ Invalid topic format: ${topic}`);
        return;
      }

      const deviceId = topicParts[3];
      console.log(`📨 Received message from device: ${deviceId}`);

      // Parse JSON payload
      let payload;
      try {
        payload = JSON.parse(message.toString());
      } catch (parseError) {
        console.error('❌ Failed to parse JSON payload:', parseError);
        return;
      }

      // Validate payload structure
      if (!this.validatePayload(payload)) {
        console.warn('⚠️ Invalid payload structure:', payload);
        return;
      }

      // Decode little-endian data
      const decodedData = this.decodeLittleEndianData(payload.data);
      
      // Create telemetry record
      const telemetryData = {
        deviceId: deviceId,
        uid: payload.uid || deviceId,
        firmware: payload.fw || 'unknown',
        tts: payload.tts || 0,
        data: decodedData,
        timestamp: new Date(),
        receivedAt: new Date(),
        rawPayload: message.toString()
      };

      // Save to database
      const telemetry = new Telemetry(telemetryData);
      await telemetry.save();

      // Update or create device
      await this.updateDevice(deviceId, payload);

      // Emit real-time update to connected clients
      if (this.io) {
        this.io.emit('telemetry:new', {
          deviceId: deviceId,
          data: telemetry.toAPIResponse()
        });
        
        this.io.emit('device:update', {
          deviceId: deviceId,
          lastSeen: new Date()
        });
      }

      console.log(`✅ Processed telemetry for device ${deviceId}:`, {
        temp: decodedData.temperature,
        hum: decodedData.humidity,
        pm25: decodedData.pm25
      });

    } catch (error) {
      console.error('❌ Error processing MQTT message:', error);
    }
  }

  validatePayload(payload) {
    return (
      payload &&
      typeof payload === 'object' &&
      payload.data &&
      typeof payload.data === 'object' &&
      typeof payload.data.temp !== 'undefined' &&
      typeof payload.data.hum !== 'undefined' &&
      typeof payload.data['pm2.5'] !== 'undefined'
    );
  }

  decodeLittleEndianData(data) {
    try {
      // Convert little-endian encoded values to floats
      const temperature = this.littleEndianToFloat(data.temp);
      const humidity = this.littleEndianToFloat(data.hum);
      const pm25 = this.littleEndianToFloat(data['pm2.5']);

      return {
        temperature: parseFloat(temperature.toFixed(2)),
        humidity: parseFloat(humidity.toFixed(2)),
        pm25: parseFloat(pm25.toFixed(2))
      };
    } catch (error) {
      console.error('❌ Error decoding little-endian data:', error);
      // Fallback: treat as regular numbers if decoding fails
      return {
        temperature: parseFloat(data.temp) || 0,
        humidity: parseFloat(data.hum) || 0,
        pm25: parseFloat(data['pm2.5']) || 0
      };
    }
  }

  littleEndianToFloat(value) {
    // If value is already a number, return it
    if (typeof value === 'number') {
      return value;
    }

    // If value is a string representing a hex number
    if (typeof value === 'string') {
      // Try to parse as hex first
      if (value.startsWith('0x') || /^[0-9a-fA-F]+$/.test(value)) {
        const hexValue = value.startsWith('0x') ? value : '0x' + value;
        const intValue = parseInt(hexValue, 16);
        
        // Convert 32-bit integer to float (IEEE 754)
        const buffer = Buffer.allocUnsafe(4);
        buffer.writeUInt32LE(intValue, 0);
        return buffer.readFloatLE(0);
      }
      
      // Try to parse as regular number
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        return numValue;
      }
    }

    // If value is a buffer or array of bytes
    if (Buffer.isBuffer(value) && value.length === 4) {
      return value.readFloatLE(0);
    }

    if (Array.isArray(value) && value.length === 4) {
      const buffer = Buffer.from(value);
      return buffer.readFloatLE(0);
    }

    // Fallback: return as-is if it's a number, otherwise 0
    return typeof value === 'number' ? value : 0;
  }

  async updateDevice(deviceId, payload) {
    try {
      let device = await Device.findOne({ uid: deviceId });
      
      if (!device) {
        // Create new device
        device = new Device({
          uid: deviceId,
          name: `Device ${deviceId}`,
          firmware: payload.fw || 'unknown',
          lastSeen: new Date(),
          isActive: true
        });
      } else {
        // Update existing device
        device.firmware = payload.fw || device.firmware;
        device.lastSeen = new Date();
        device.isActive = true;
      }

      await device.save();
    } catch (error) {
      console.error('❌ Error updating device:', error);
    }
  }

  stop() {
    if (this.client) {
      console.log('🛑 Stopping MQTT worker...');
      this.client.end();
      this.isConnected = false;
    }
  }

  getStatus() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Create singleton instance
const mqttWorker = new MQTTWorker();

module.exports = mqttWorker;