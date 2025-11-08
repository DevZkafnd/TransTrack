import React, { useState, useEffect } from 'react';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { getSchedules, getUserTickets, getOperatingBuses, triggerAssignBuses } from '../services/apiService';

const SchedulePage = () => {
  const { isAuthenticated, user } = useAuth();
  const [activeSchedules, setActiveSchedules] = useState([]);
  const [userSchedules, setUserSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  const [toast, setToast] = useState({ open: false, type: 'info', message: '' });
  const notify = (type, message) => setToast({ open: true, type, message });

  // Load data dari API
  useEffect(() => {
    let isMounted = true;
    
    // Trigger assign buses saat page refresh (browser refresh)
    const triggerAssignOnRefresh = async () => {
      try {
        console.log('🔄 [SchedulePage] Trigger assign buses saat page refresh...');
        await triggerAssignBuses();
        console.log('✅ [SchedulePage] Assign buses triggered');
        // Tunggu sebentar agar assign buses selesai
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (err) {
        console.warn('⚠️ [SchedulePage] Error triggering assign buses:', err);
        // Continue even if assign buses fails
      }
    };
    
    const loadData = async (showLoading = false) => {
      try {
        if (showLoading) {
          setLoading(true);
        }
        
        // Load bus yang sedang beroperasi dari endpoint /dashboard/operating-buses
        // Endpoint ini mengambil semua bus dari BusService dan status maintenance dari MaintenanceService
        // TIDAK menggunakan ScheduleService
        const operatingBusesRes = await getOperatingBuses().catch(err => {
          console.error('Error loading operating buses:', err);
          return { success: false, data: [] };
        });

        if (isMounted && operatingBusesRes.success && operatingBusesRes.data && Array.isArray(operatingBusesRes.data)) {
          // Data dari endpoint operating-buses sudah dalam format yang benar:
          // { bus, model, capacity, rute, status }
          setActiveSchedules(operatingBusesRes.data);
        } else {
          setActiveSchedules([]);
        }

        // Load schedules untuk user schedules (jika user sudah login)
        const schedulesRes = await getSchedules().catch(err => {
          console.error('Error loading schedules:', err);
          return { success: false, data: [] };
        });

        if (isMounted && schedulesRes.success && schedulesRes.data && Array.isArray(schedulesRes.data)) {
          // Jadwal aktif user = komunikasi antar API service:
          // 1. Ambil tickets user dari TicketService
          // 2. Ambil scheduleId dari setiap ticket
          // 3. Filter schedules dari ScheduleService berdasarkan scheduleId
          // Ini berbeda dengan jadwal yang sedang beroperasi
          if (isAuthenticated && user?.id) {
            try {
              const ticketsRes = await getUserTickets(user.id).catch(err => {
                console.error('Error loading user tickets:', err);
                return { success: false, data: [] };
              });

              if (ticketsRes.success && ticketsRes.data && Array.isArray(ticketsRes.data)) {
                // Ambil scheduleId dari setiap ticket
                const scheduleIds = ticketsRes.data
                  .map(t => t.scheduleId || t.schedule_id)
                  .filter(Boolean);
                
                // Filter schedules berdasarkan scheduleId atau ticketId
                const userScheds = schedulesRes.data.filter(s => {
                  // Cek apakah schedule.id ada di scheduleIds dari ticket
                  if (scheduleIds.includes(s.id)) return true;
                  // Atau cek apakah ticket.id ada di schedule.ticketId
                  const ticketIds = ticketsRes.data.map(t => t.id);
                  return ticketIds.includes(s.ticketId);
                });
                setUserSchedules(userScheds);
              }
            } catch (error) {
              console.error('Error loading user tickets:', error);
            }
          } else {
            setUserSchedules([]);
          }
        }

      } catch (error) {
        console.error('Error loading data:', error);
        if (isMounted && showLoading) {
          notify('error', 'Gagal memuat data. Silakan refresh halaman.');
        }
      } finally {
        if (isMounted && showLoading) {
          setLoading(false);
        }
      }
    };

    // Trigger assign buses saat page refresh (browser refresh)
    triggerAssignOnRefresh().then(() => {
      // Load pertama kali dengan loading indicator setelah assign buses
      loadData(true);
    });
    
    // Refresh schedules setiap 5 detik untuk update real-time (tanpa loading indicator)
    const interval = setInterval(() => {
      loadData(false);
    }, 5000);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-secondary"></div>
          <p className="mt-4 text-textSecondary">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-text">Cek Jadwal</h1>
        <p className="text-textSecondary mt-2">
          Dapatkan informasi jadwal kedatangan dan keberangkatan bus yang selalu ter-update.
        </p>
      </div>

      {/* Bus yang Sedang Beroperasi */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Bus yang Sedang Beroperasi</h2>
            <p className="text-sm text-textSecondary mt-1">
              Daftar semua bus dari database dengan status operasi (tidak menggunakan ScheduleService)
            </p>
          </div>
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
            {activeSchedules.length} Bus
          </span>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-sm text-textSecondary border-b">
              <th className="py-2">Plat Nomor</th>
              <th className="py-2">Model</th>
              <th className="py-2">Kapasitas</th>
              <th className="py-2">Rute</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
              {activeSchedules.length > 0 ? (
                activeSchedules.map((bus, index) => {
                  // Data dari endpoint sudah dalam format: { bus, model, capacity, rute, status }
                  // Status sudah dihitung di backend berdasarkan maintenance
                  let statusClass = 'bg-green-100 text-green-700';
                  
                  if (bus.status === 'Maintenance') {
                    statusClass = 'bg-yellow-100 text-yellow-700';
                  } else if (bus.status === 'Beroperasi') {
                    statusClass = 'bg-blue-100 text-blue-700';
                  }
                  
                  return (
                    <tr key={index} className="border-b last:border-none hover:bg-gray-50">
                      <td className="py-3 font-medium">{bus.bus || '-'}</td>
                      <td className="py-3">{bus.model || '-'}</td>
                      <td className="py-3">{bus.capacity || '-'}</td>
                      <td className="py-3">{bus.rute || '-'}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${statusClass}`}>
                          {bus.status || 'Beroperasi'}
                        </span>
                      </td>
                </tr>
                  );
                })
            ) : (
              <tr>
                  <td colSpan="5" className="text-center py-8 text-gray-400">
                    <div className="flex flex-col items-center">
                      <svg className="w-12 h-12 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p>Tidak ada bus yang sedang beroperasi</p>
                    </div>
                  </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
          </div>

      {/* Jadwal Aktif User (Hanya jika sudah login) */}
      {isAuthenticated && (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
          <div>
              <h2 className="text-xl font-semibold">Jadwal Aktif Saya</h2>
              <p className="text-sm text-textSecondary mt-1">
                Jadwal berdasarkan tiket yang Anda miliki
              </p>
            </div>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
              {userSchedules.length} Jadwal
            </span>
          </div>
          <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-sm text-textSecondary border-b">
              <th className="py-2">Rute</th>
              <th className="py-2">Bus</th>
              <th className="py-2">Pengemudi</th>
              <th className="py-2">Waktu</th>
                  <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
                {userSchedules.length > 0 ? (
                  userSchedules.map((s) => {
                    const scheduleTime = s.time ? new Date(s.time) : null;
                    const now = new Date();
                    const isActive = scheduleTime && scheduleTime <= now;
                    
                    let statusText = 'Terjadwal';
                    let statusClass = 'bg-gray-100 text-gray-700';
                    
                    if (isActive) {
                      statusText = 'Beroperasi';
                      statusClass = 'bg-green-100 text-green-700';
                    }
                    
                    return (
                      <tr key={s.id} className={`border-b last:border-none ${isActive ? 'bg-green-50' : ''} hover:bg-gray-50`}>
                        <td className="py-3 font-medium">{s.routeName || s.route || '-'}</td>
                        <td className="py-3">{s.busPlate || s.bus || '-'}</td>
                        <td className="py-3">{s.driverName || s.driver || '-'}</td>
                        <td className="py-3">
                          {scheduleTime 
                            ? scheduleTime.toLocaleString('id-ID', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : s.time || '-'
                          }
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${statusClass}`}>
                            {statusText}
                          </span>
                        </td>
                </tr>
                    );
                  })
            ) : (
              <tr>
                    <td colSpan="5" className="text-center py-8 text-gray-400">
                      <div className="flex flex-col items-center">
                        <svg className="w-12 h-12 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p>Anda belum memiliki jadwal aktif</p>
                        <p className="text-xs mt-1">Beli tiket untuk melihat jadwal Anda di sini</p>
          </div>
                    </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
          </div>
      )}


      <Toast
        open={toast.open}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </div>
  );
};

export default SchedulePage;
