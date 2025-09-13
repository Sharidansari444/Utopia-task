import axios from 'axios';

// Configure axios defaults
axios.defaults.baseURL = process.env.REACT_APP_API_URL || '/api';

// Add request interceptor to include auth token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Authentication API
export const authAPI = {
  // Login user
  login: async (email, password) => {
    const response = await axios.post('/auth/login', { email, password });
    return response.data;
  },

  // Register user
  register: async ( name, email, password) => {
    const response = await axios.post('/auth/register', {  name, email, password});
    return response.data;
  },

  // Get current user
  getCurrentUser: async () => {
    const response = await axios.get('/auth/me');
    return response.data;
  },

  // Logout user
  logout: async () => {
    const response = await axios.post('/auth/logout');
    return response.data;
  }
};

// Devices API
export const devicesAPI = {
  // Get all devices with pagination and filters
  getDevices: async (params = {}) => {
    const response = await axios.get('/devices', { params });
    return response.data;
  },

  // Get single device by ID or UID
  getDevice: async (id) => {
    const response = await axios.get(`/devices/${id}`);
    return response.data;
  },

  // Get device telemetry data
  getDeviceTelemetry: async (deviceId, params = {}) => {
    const response = await axios.get(`/devices/${deviceId}/data`, { params });
    return response.data;
  },

  // Create new device
  createDevice: async (deviceData) => {
    const response = await axios.post('/devices', deviceData);
    return response.data;
  },

  // Update device
  updateDevice: async (id, deviceData) => {
    const response = await axios.put(`/devices/${id}`, deviceData);
    return response.data;
  },

  // Delete device
  deleteDevice: async (id) => {
    const response = await axios.delete(`/devices/${id}`);
    return response.data;
  },

  // Get device statistics summary
  getDeviceStats: async () => {
    const response = await axios.get('/devices/stats/summary');
    return response.data;
  }
};

// Telemetry API
export const telemetryAPI = {
  // Get telemetry data with filters
  getTelemetry: async (params = {}) => {
    const response = await axios.get('/telemetry', { params });
    return response.data;
  },

  // Get telemetry by device
  getTelemetryByDevice: async (deviceId, params = {}) => {
    const response = await axios.get(`/telemetry/device/${deviceId}`, { params });
    return response.data;
  },

  // Create telemetry data
  createTelemetry: async (telemetryData) => {
    const response = await axios.post('/telemetry', telemetryData);
    return response.data;
  },

  // Get telemetry statistics
  getTelemetryStats: async (params = {}) => {
    const response = await axios.get('/telemetry/stats', { params });
    return response.data;
  }
};

// Health check API
export const healthAPI = {
  // Check server health
  checkHealth: async () => {
    const response = await axios.get('/health');
    return response.data;
  }
};

// Export default axios instance for custom requests
export default axios;