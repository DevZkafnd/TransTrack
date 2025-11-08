#!/usr/bin/env node
/**
 * Script untuk check status semua service yang diperlukan
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const axios = require('axios');

const BUS_SERVICE_URL = process.env.BUS_SERVICE_URL || 'http://localhost:3006';
const ROUTE_SERVICE_URL = process.env.ROUTE_SERVICE_URL || 'http://localhost:3000';
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8000';

async function checkService(name, url, healthPath = '/health') {
  try {
    const response = await axios.get(`${url}${healthPath}`, {
      timeout: 3000,
      validateStatus: (status) => status < 500,
    });
    
    if (response.status === 200) {
      return { status: 'OK', data: response.data };
    } else {
      return { status: 'ERROR', message: `Status ${response.status}` };
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return { status: 'DOWN', message: 'Service tidak berjalan' };
    } else {
      return { status: 'ERROR', message: error.message };
    }
  }
}

async function checkApiEndpoint(name, url, endpoint) {
  try {
    const response = await axios.get(`${url}${endpoint}`, {
      timeout: 5000,
      validateStatus: (status) => status < 500,
    });
    
    if (response.status === 200 && response.data?.success) {
      const count = response.data.data?.length || 0;
      return { status: 'OK', count };
    } else {
      return { status: 'ERROR', message: `Status ${response.status}` };
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return { status: 'DOWN', message: 'Service tidak berjalan' };
    } else {
      return { status: 'ERROR', message: error.message };
    }
  }
}

async function main() {
  console.log('🔍 Checking Services Status');
  console.log('='.repeat(60));
  console.log('');
  
  // Check RouteService
  console.log('1️⃣ RouteService');
  console.log(`   URL: ${ROUTE_SERVICE_URL}`);
  const routeHealth = await checkService('RouteService', ROUTE_SERVICE_URL);
  if (routeHealth.status === 'OK') {
    console.log(`   ✅ Status: ${routeHealth.status}`);
    const routes = await checkApiEndpoint('RouteService', ROUTE_SERVICE_URL, '/api/routes');
    if (routes.status === 'OK') {
      console.log(`   📊 Routes: ${routes.count} ditemukan`);
    }
  } else {
    console.log(`   ❌ Status: ${routeHealth.status} - ${routeHealth.message}`);
  }
  console.log('');
  
  // Check BusService
  console.log('2️⃣ BusService');
  console.log(`   URL: ${BUS_SERVICE_URL}`);
  console.log(`   Expected Port: 3006`);
  const busHealth = await checkService('BusService', BUS_SERVICE_URL);
  if (busHealth.status === 'OK') {
    console.log(`   ✅ Status: ${busHealth.status}`);
    const buses = await checkApiEndpoint('BusService', BUS_SERVICE_URL, '/api/buses');
    if (buses.status === 'OK') {
      console.log(`   📊 Buses: ${buses.count} ditemukan`);
    }
  } else {
    console.log(`   ❌ Status: ${busHealth.status} - ${busHealth.message}`);
    console.log(`   💡 Pastikan BusService berjalan di port 3006`);
    console.log(`   💡 Jalankan: cd ../busservice && npm run dev`);
    console.log(`   💡 Atau check .env file di busservice folder: PORT=3006`);
  }
  console.log('');
  
  // Check Gateway
  console.log('3️⃣ Gateway Service');
  console.log(`   URL: ${GATEWAY_URL}`);
  const gatewayHealth = await checkService('Gateway', GATEWAY_URL);
  if (gatewayHealth.status === 'OK') {
    console.log(`   ✅ Status: ${gatewayHealth.status}`);
  } else {
    console.log(`   ❌ Status: ${gatewayHealth.status} - ${gatewayHealth.message}`);
    console.log(`   💡 Jalankan: cd ../gatewayservice && npm run dev`);
  }
  console.log('');
  
  console.log('='.repeat(60));
  
  if (busHealth.status !== 'OK') {
    console.log('\n⚠️  BusService tidak berjalan!');
    console.log('💡 Opsi:');
    console.log('   1. Jalankan BusService: cd ../busservice && npm run dev');
    console.log('   2. Gunakan assign manual: npm run assign-buses-manual');
    console.log('');
  } else {
    console.log('\n✅ Semua service berjalan dengan baik!');
    console.log('💡 Sekarang bisa jalankan: npm run assign-buses');
    console.log('');
  }
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

