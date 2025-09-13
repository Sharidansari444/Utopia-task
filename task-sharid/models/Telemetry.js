const mongoose = require('mongoose');

const telemetrySchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    ref: 'Device'
  },
  uid: {
    type: String,
    required: true
  },
  firmware: {
    type: String,
    default: 'unknown'
  },
  tts: {
    type: Number,
    default: 0
  },
  data: {
    temperature: {
      type: Number,
      required: true
    },
    humidity: {
      type: Number,
      required: true
    },
    pm25: {
      type: Number,
      required: true
    }
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  receivedAt: {
    type: Date,
    default: Date.now
  },
  rawPayload: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
telemetrySchema.index({ deviceId: 1, timestamp: -1 });
telemetrySchema.index({ timestamp: -1 });
telemetrySchema.index({ deviceId: 1 });
telemetrySchema.index({ receivedAt: -1 });

// Compound index for latest data queries
telemetrySchema.index({ deviceId: 1, receivedAt: -1 });

// TTL index to automatically delete old data after 90 days (optional)
// telemetrySchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

// Static method to get latest reading for a device
telemetrySchema.statics.getLatestByDevice = function(deviceId) {
  return this.findOne({ deviceId }).sort({ timestamp: -1 });
};

// Static method to get last N readings for a device
telemetrySchema.statics.getLastNReadings = function(deviceId, limit = 10) {
  return this.find({ deviceId })
    .sort({ timestamp: -1 })
    .limit(limit);
};

// Instance method to format data for API response
telemetrySchema.methods.toAPIResponse = function() {
  return {
    id: this._id,
    deviceId: this.deviceId,
    uid: this.uid,
    firmware: this.firmware,
    tts: this.tts,
    data: {
      temperature: parseFloat(this.data.temperature.toFixed(2)),
      humidity: parseFloat(this.data.humidity.toFixed(2)),
      pm25: parseFloat(this.data.pm25.toFixed(2))
    },
    timestamp: this.timestamp,
    receivedAt: this.receivedAt
  };
};

module.exports = mongoose.model('Telemetry', telemetrySchema);