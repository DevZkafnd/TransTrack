/**
 * Service untuk komunikasi dengan BusService
 */
const axios = require('axios');

const BUS_SERVICE_URL = process.env.BUS_SERVICE_URL || 'http://localhost:3006';

/**
 * Mengambil data bus berdasarkan ID
 * @param {string} busId - ID bus (UUID)
 * @returns {Promise<Object|null>} Data bus atau null jika tidak ditemukan
 */
async function getBusById(busId) {
  if (!busId) {
    return null;
  }

  try {
    const response = await axios.get(`${BUS_SERVICE_URL}/api/buses/${busId}`, {
      timeout: 3000,
      validateStatus: (status) => status < 500, // Accept 200-499
    });

    if (response.status === 200 && response.data.success) {
      return response.data.data;
    }

    return null;
  } catch (error) {
    // Handle connection errors gracefully - jangan log ECONNRESET/ECONNREFUSED
    // Ini memastikan jika busservice down, routeservice tetap bisa berjalan
    if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      // Silent fail untuk connection errors
      return null;
    }
    // Hanya log error lain yang tidak terkait connection
    if (error.response && error.response.status >= 500) {
      console.warn(`[BusService] Error fetching bus ${busId}:`, error.message);
    }
    return null;
  }
}

/**
 * Mengambil data multiple buses berdasarkan array ID
 * @param {string[]} busIds - Array ID bus
 * @returns {Promise<Object>} Object dengan key busId dan value bus data
 */
async function getBusesByIds(busIds) {
  if (!busIds || busIds.length === 0) {
    return {};
  }

  // Filter null/undefined dan unique
  const uniqueBusIds = [...new Set(busIds.filter(id => id))];

  if (uniqueBusIds.length === 0) {
    return {};
  }

  try {
    // Fetch all buses in parallel
    const promises = uniqueBusIds.map(busId => 
      getBusById(busId).then(bus => ({ busId, bus }))
    );

    const results = await Promise.all(promises);

    // Convert to object with busId as key
    const busMap = {};
    results.forEach(({ busId, bus }) => {
      if (bus) {
        busMap[busId] = bus;
      }
    });

    return busMap;
  } catch (error) {
    console.warn('[BusService] Error fetching multiple buses:', error.message);
    return {};
  }
}

/**
 * Mengambil semua bus dari BusService
 * @returns {Promise<Array>} Array of buses
 */
async function getAllBuses() {
  try {
    const response = await axios.get(`${BUS_SERVICE_URL}/api/buses?limit=1000`, {
      timeout: 5000,
      validateStatus: (status) => status < 500,
    });

    if (response.status === 200 && response.data.success) {
      return response.data.data || [];
    }

    return [];
  } catch (error) {
    console.warn('[BusService] Error fetching all buses:', error.message);
    return [];
  }
}

module.exports = {
  getBusById,
  getBusesByIds,
  getAllBuses,
  BUS_SERVICE_URL,
};

