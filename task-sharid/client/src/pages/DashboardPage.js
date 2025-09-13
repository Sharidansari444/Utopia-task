import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { devicesAPI } from '../services/api';
import { useSocket } from '../contexts/SocketContext';
import { 
  Cpu, 
  Thermometer, 
  Droplets, 
  Wind, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { format } from 'date-fns';

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [recentDevices, setRecentDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { connected, telemetryUpdates, deviceUpdates } = useSocket();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Update stats when new telemetry arrives
  useEffect(() => {
    if (telemetryUpdates.length > 0) {
      fetchDashboardData();
    }
  }, [telemetryUpdates]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch device statistics
      const [statsResponse, devicesResponse] = await Promise.all([
        devicesAPI.getDeviceStats(),
        devicesAPI.getDevices({ limit: 5 })
      ]);

      if (statsResponse.success) {
        setStats(statsResponse.data);
      }

      if (devicesResponse.success) {
        setRecentDevices(devicesResponse.data.devices);
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getDeviceStatus = (device) => {
    if (!device.latestReading) return 'offline';
    
    const lastSeen = new Date(device.lastSeen || device.latestReading.timestamp);
    const now = new Date();
    const minutesAgo = (now - lastSeen) / (1000 * 60);
    
    if (minutesAgo < 5) return 'online';
    if (minutesAgo < 30) return 'warning';
    return 'offline';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'offline': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <Clock className="h-4 w-4" />;
      case 'offline': return <AlertTriangle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" text="Loading dashboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Dashboard</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="btn btn-primary"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Monitor your IoT devices in real-time</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm ${
            connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              connected ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span>{connected ? 'Live' : 'Offline'}</span>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card mb-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Cpu className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Devices</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalDevices || 0}</p>
            </div>
          </div>
        </div>

        <div className="card mb-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Devices</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.activeDevices || 0}</p>
            </div>
          </div>
        </div>

        <div className="card mb-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Offline Devices</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.inactiveDevices || 0}</p>
            </div>
          </div>
        </div>

        <div className="card mb-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Recent Readings</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.recentReadings || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Devices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device List */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Devices</h2>
            <Link
              to="/devices"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View All
            </Link>
          </div>
          
          {recentDevices.length === 0 ? (
            <div className="text-center py-8">
              <Cpu className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">No devices found</p>
              <p className="text-sm text-gray-400 mt-1">
                Devices will appear here once they start sending data
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentDevices.map((device) => {
                const status = getDeviceStatus(device);
                return (
                  <div key={device._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${getStatusColor(status)}`}>
                        {getStatusIcon(status)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{device.name}</p>
                        <p className="text-sm text-gray-500">{device.uid}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {device.latestReading ? (
                        <>
                          <p className="text-sm font-medium text-gray-900">
                            {device.latestReading.data.temperature}°C
                          </p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(device.latestReading.timestamp), 'HH:mm')}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-gray-500">No data</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Updates */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Live Updates</h2>
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
              connected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${
                connected ? 'bg-green-500' : 'bg-gray-500'
              }`}></div>
              <span>{connected ? 'Live' : 'Offline'}</span>
            </div>
          </div>
          
          {telemetryUpdates.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">No recent updates</p>
              <p className="text-sm text-gray-400 mt-1">
                Live telemetry data will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {telemetryUpdates.slice(0, 10).map((update, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-1.5 bg-blue-100 rounded-lg">
                      <Activity className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{update.deviceId}</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(update.timestamp), 'HH:mm:ss')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <Thermometer className="h-3 w-3 text-red-500" />
                      <span>{update.data?.temperature}°C</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Droplets className="h-3 w-3 text-blue-500" />
                      <span>{update.data?.humidity}%</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Wind className="h-3 w-3 text-gray-500" />
                      <span>{update.data?.pm25}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;