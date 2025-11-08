import axios from 'axios';

/**
 * Service untuk melakukan panggilan API ke API Gateway
 * 
 * Menggunakan variabel REACT_APP_API_GATEWAY_URL dari .env
 * Default: http://localhost:8000/api
 */

// Base URL untuk API Gateway
const ENV_URL = process.env.REACT_APP_API_GATEWAY_URL;
const API_GATEWAY_URL = ENV_URL || 'http://localhost:8000/api';

// Buat instance axios dengan konfigurasi default
const apiClient = axios.create({
  baseURL: API_GATEWAY_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor untuk request (opsional: tambahkan auth token di sini)
apiClient.interceptors.request.use(
  (config) => {
    // Contoh: tambahkan token jika diperlukan
    // const token = localStorage.getItem('authToken');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor untuk response (opsional: handle error global di sini)
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle error global (contoh: redirect ke login jika 401)
    if (error.response?.status === 401) {
      // Handle unauthorized
      console.error('Unauthorized access');
    }
    return Promise.reject(error);
  }
);

/**
 * Fungsi untuk mengambil data routes dari RouteService (via Gateway)
 */
export const getRoutes = async () => {
  try {
    const response = await apiClient.get('/routes');
    return response.data;
  } catch (error) {
    console.error('Error fetching routes:', error);
    throw error;
  }
};

/**
 * Fungsi untuk mengambil data drivers dari DriverService (via Gateway)
 */
export const getDrivers = async () => {
  try {
    const response = await apiClient.get('/drivers');
    return response.data;
  } catch (error) {
    console.error('Error fetching drivers:', error);
    throw error;
  }
};

/**
 * Fungsi untuk mengambil data maintenance berdasarkan bus ID (via Gateway)
 */
export const getMaintenanceByBusId = async (busId, status = null) => {
  try {
    const params = {};
    if (status) {
      params.status = status;
    }
    const response = await apiClient.get(`/maintenance/bus/${busId}`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching maintenance:', error);
    throw error;
  }
};

/**
 * Fungsi untuk mengecek apakah bus sedang dalam maintenance (via Gateway)
 */
export const checkBusMaintenance = async (busId) => {
  try {
    // Cek maintenance dengan status scheduled atau in_progress
    const [scheduledResponse, inProgressResponse] = await Promise.all([
      apiClient.get(`/maintenance/bus/${busId}`, {
        params: { status: 'scheduled', limit: 1 }
      }).catch(() => ({ data: { data: [] } })),
      apiClient.get(`/maintenance/bus/${busId}`, {
        params: { status: 'in_progress', limit: 1 }
      }).catch(() => ({ data: { data: [] } }))
    ]);
    
    const scheduled = scheduledResponse.data?.data || [];
    const inProgress = inProgressResponse.data?.data || [];
    return scheduled.length > 0 || inProgress.length > 0;
  } catch (error) {
    console.error('Error checking bus maintenance:', error);
    return false;
  }
};

/**
 * Fungsi untuk mengambil data buses dari BusService (via Gateway)
 */
export const getBuses = async () => {
  try {
    const response = await apiClient.get('/buses');
    return response.data;
  } catch (error) {
    console.error('Error fetching buses:', error);
    throw error;
  }
};


// TicketService helpers (via Gateway)
export const createTicket = async ({ userId, scheduleId, scheduleLabel, amount, currency = 'IDR' }) => {
  const res = await apiClient.post('/tickets', { userId, scheduleId, scheduleLabel, amount, currency });
  return res.data;
};

export const updateTicketStatus = async (ticketId, { status, paymentRef }) => {
  const res = await apiClient.patch(`/tickets/${ticketId}/status`, { status, paymentRef });
  return res.data;
};

export const getUserTickets = async (userId) => {
  const res = await apiClient.get('/tickets', { params: { userId } });
  return res.data;
};

export const validateTicket = async (code) => {
  const res = await apiClient.post('/tickets/validate', { code });
  return res.data;
};

// Schedules - mengambil schedule yang sudah ada di database (seperti jadwal penerbangan)
// Schedule sudah ada di database, user hanya memilih dan membeli tiket
export const searchSchedules = async (query) => {
  try {
    const res = await apiClient.get('/schedules');
    const data = res.data?.data || res.data || [];
    if (!query) return data;
    const q = String(query).toLowerCase();
    // Filter berdasarkan routeName atau route
    return data.filter((s) => 
      (s.routeName || s.route || '').toLowerCase().includes(q) ||
      (s.route_name || '').toLowerCase().includes(q)
    );
  } catch (error) {
    console.error('Error searching schedules:', error);
    return [];
  }
};

/**
 * Fungsi untuk membuat schedule baru (via Gateway)
 */
export const createSchedule = async (scheduleData) => {
  try {
    const response = await apiClient.post('/schedules', scheduleData);
    return response.data;
  } catch (error) {
    console.error('Error creating schedule:', error);
    throw error;
  }
};

/**
 * Fungsi untuk mengambil semua schedules (via Gateway)
 */
export const getSchedules = async (params = {}) => {
  try {
    const response = await apiClient.get('/schedules', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching schedules:', error);
    throw error;
  }
};

/**
 * Fungsi untuk mengambil schedule berdasarkan ID (via Gateway)
 */
export const getScheduleById = async (id) => {
  try {
    const response = await apiClient.get(`/schedules/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching schedule:', error);
    throw error;
  }
};

/**
 * Fungsi untuk mengupdate schedule (via Gateway)
 */
export const updateSchedule = async (id, scheduleData) => {
  try {
    const response = await apiClient.put(`/schedules/${id}`, scheduleData);
    return response.data;
  } catch (error) {
    console.error('Error updating schedule:', error);
    throw error;
  }
};

/**
 * Fungsi untuk menghapus schedule (via Gateway)
 */
export const deleteSchedule = async (id) => {
  try {
    const response = await apiClient.delete(`/schedules/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting schedule:', error);
    throw error;
  }
};

/**
 * Fungsi untuk mengambil bus yang sedang beroperasi dengan data lengkap (aggregated)
 * Menggunakan endpoint /dashboard/operating-buses yang mengambil dari BusService + MaintenanceService
 * TIDAK menggunakan ScheduleService
 */
export const getOperatingBuses = async () => {
  try {
    const response = await apiClient.get('/dashboard/operating-buses');
    return response.data;
  } catch (error) {
    console.error('Error fetching operating buses:', error);
    throw error;
  }
};

/**
 * Fungsi untuk mengambil data tracking bus dengan informasi lengkap (routes, stops, drivers, schedules)
 * Menggunakan endpoint /dashboard/tracking yang mengaggregate dari semua services
 */
export const getTrackingData = async () => {
  try {
    const response = await apiClient.get('/dashboard/tracking');
    return response.data;
  } catch (error) {
    console.error('Error fetching tracking data:', error);
    throw error;
  }
};

/**
 * Fungsi untuk trigger assign buses ke routes
 * Menggunakan endpoint /routes/assign-buses di RouteService
 */
export const triggerAssignBuses = async () => {
  try {
    console.log('🔄 [Frontend] Memanggil triggerAssignBuses...');
    const response = await apiClient.post('/routes/assign-buses');
    console.log('✅ [Frontend] triggerAssignBuses response:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ [Frontend] Error triggering assign buses:', error);
    console.error('❌ [Frontend] Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
};

/**
 * Export default apiClient untuk penggunaan langsung jika diperlukan
 */
export default apiClient;

