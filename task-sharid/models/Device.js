const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  firmware: {
    type: String,
    default: 'unknown'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  location: {
    type: String,
    default: 'Unknown'
  },
  deviceType: {
    type: String,
    default: 'sensor'
  }
}, {
  timestamps: true
});

// Index for faster queries
deviceSchema.index({ uid: 1 });
deviceSchema.index({ isActive: 1 });
deviceSchema.index({ lastSeen: -1 });

// Virtual for latest telemetry
deviceSchema.virtual('latestTelemetry', {
  ref: 'Telemetry',
  localField: 'uid',
  foreignField: 'deviceId',
  justOne: true,
  options: { sort: { timestamp: -1 } }
});

// Ensure virtual fields are serialized
deviceSchema.set('toJSON', { virtuals: true });
deviceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Device', deviceSchema);