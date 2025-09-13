import React, { useState, useEffect, useCallback } from 'react';
import { devicesAPI } from '../services/api';
import { useSocket } from '../contexts/SocketContext';
import { 
  Search, 
  Filter, 
  Cpu, 
  Thermometer, 
  Droplets, 
  Wind, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { format } from 'date-fns';

const DevicesPage = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [deviceTelemetry, setDeviceTelemetry] = useState([]);
  const [telemetryLoading, setTelemetryLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  
  const { connected, telemetryUpdates, deviceUpdates } = useSocket();

  useEffect(() => {
    fetchDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, searchTerm, statusFilter]);

  // Update devices when new telemetry arrives
  useEffect(() => {
    if (telemetryUpdates.length > 0) {
      const latestUpdate = telemetryUpdates[telemetryUpdates.length - 1];
      setDevices(prevDevices => 
        prevDevices.map(device => {
          if (device.uid === latestUpdate.deviceId) {
            return {
              ...device,
              latestReading: {
                ...latestUpdate,
                timestamp: latestUpdate.timestamp
              },
              lastSeen: latestUpdate.timestamp
            };
          }
          return device;
        })
      );
    }
  }, [telemetryUpdates]);

  // Update devices when device status changes
  useEffect(() => {
    if (deviceUpdates.length > 0) {
      const latestUpdate = deviceUpdates[deviceUpdates.length - 1];
      setDevices(prevDevices => 
        prevDevices.map(device => {
          if (device.uid === latestUpdate.deviceId) {
            return {
              ...device,
              status: latestUpdate.status || device.status,
              lastSeen: latestUpdate.timestamp || device.lastSeen
            };
          }
          return device;
        })
      );
    }
  }, [deviceUpdates]);

  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined
      };
      
      const response = await devicesAPI.getDevices(params);
      
      if (response.success) {
        setDevices(response.data.devices);
        setPagination(prev => ({
          ...prev,
          total: response.data.total,
          totalPages: response.data.totalPages
        }));
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching devices:', err);
      setError('Failed to load devices');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, searchTerm, statusFilter]);

  const fetchDeviceTelemetry = async (deviceId) => {
    try {
      setTelemetryLoading(true);
      const response = await devicesAPI.getDeviceTelemetry(deviceId);
       
       if (response.success) {
         setDeviceTelemetry(response.data);
      }
    } catch (err) {
      console.error('Error fetching device telemetry:', err);
      setDeviceTelemetry([]);
    } finally {
      setTelemetryLoading(false);
    }
  };

  const handleDeviceClick = async (device) => {
    setSelectedDevice(device);
    await fetchDeviceTelemetry(device._id);
  };

  const closeModal = () => {
    setSelectedDevice(null);
    setDeviceTelemetry([]);
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

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  if (loading && devices.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" text="Loading devices..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Devices</h1>
          <p className="text-gray-600">Manage and monitor your IoT devices</p>
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
          <button
            onClick={fetchDevices}
            className="btn btn-secondary"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search devices by name or UID..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="input pl-10"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={handleStatusFilterChange}
            className="input pl-10 pr-8"
          >
            <option value="all">All Status</option>
            <option value="online">Online</option>
            <option value="warning">Warning</option>
            <option value="offline">Offline</option>
          </select>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Devices Grid */}
      {devices.length === 0 && !loading ? (
        <div className="text-center py-12">
          <Cpu className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No devices found</h3>
          <p className="text-gray-600">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'Devices will appear here once they start sending data'
            }
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {devices.map((device) => {
              const status = getDeviceStatus(device);
              return (
                <div
                  key={device._id}
                  onClick={() => handleDeviceClick(device)}
                  className="card hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${getStatusColor(status)}`}>
                        {getStatusIcon(status)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{device.name}</h3>
                        <p className="text-sm text-gray-500">{device.uid}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                      getStatusColor(status)
                    }`}>
                      {status}
                    </span>
                  </div>

                  {device.latestReading ? (
                    <>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-1">
                            <Thermometer className="h-4 w-4 text-red-500" />
                          </div>
                          <p className="text-lg font-semibold text-gray-900">
                            {device.latestReading.data.temperature}°C
                          </p>
                          <p className="text-xs text-gray-500">Temperature</p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-1">
                            <Droplets className="h-4 w-4 text-blue-500" />
                          </div>
                          <p className="text-lg font-semibold text-gray-900">
                            {device.latestReading.data.humidity}%
                          </p>
                          <p className="text-xs text-gray-500">Humidity</p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-1">
                            <Wind className="h-4 w-4 text-gray-500" />
                          </div>
                          <p className="text-lg font-semibold text-gray-900">
                            {device.latestReading.data.pm25}
                          </p>
                          <p className="text-xs text-gray-500">PM2.5</p>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 text-center">
                        Last updated: {format(new Date(device.latestReading.timestamp), 'MMM dd, HH:mm:ss')}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <Activity className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">No data available</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} devices
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-3 py-1 text-sm font-medium text-gray-700">
                  {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Device Detail Modal */}
      {selectedDevice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{selectedDevice.name}</h2>
                <p className="text-gray-600">{selectedDevice.uid}</p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Current Status */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Current Status</h3>
                {selectedDevice.latestReading ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="card">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-red-100 rounded-lg">
                          <Thermometer className="h-6 w-6 text-red-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-gray-900">
                            {selectedDevice.latestReading.data.temperature}°C
                          </p>
                          <p className="text-sm text-gray-600">Temperature</p>
                        </div>
                      </div>
                    </div>
                    <div className="card">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Droplets className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-gray-900">
                            {selectedDevice.latestReading.data.humidity}%
                          </p>
                          <p className="text-sm text-gray-600">Humidity</p>
                        </div>
                      </div>
                    </div>
                    <div className="card">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <Wind className="h-6 w-6 text-gray-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-gray-900">
                            {selectedDevice.latestReading.data.pm25}
                          </p>
                          <p className="text-sm text-gray-600">PM2.5</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">No current data available</p>
                  </div>
                )}
              </div>

              {/* Historical Data */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Readings</h3>
                {telemetryLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner text="Loading telemetry data..." />
                  </div>
                ) : deviceTelemetry.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">No historical data available</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {deviceTelemetry.map((reading, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="text-sm text-gray-600">
                            {format(new Date(reading.timestamp), 'MMM dd, HH:mm:ss')}
                          </div>
                        </div>
                        <div className="flex items-center space-x-6">
                          <div className="flex items-center space-x-2">
                            <Thermometer className="h-4 w-4 text-red-500" />
                            <span className="text-sm font-medium">{reading.data.temperature}°C</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Droplets className="h-4 w-4 text-blue-500" />
                            <span className="text-sm font-medium">{reading.data.humidity}%</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Wind className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium">{reading.data.pm25}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DevicesPage;