import React, { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getTrackingData } from "../services/apiService";

const pulseStyle = `
  .bus-marker {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.25));
  }
  .bus-marker::before {
    content: "";
    position: absolute;
    width: 40px;
    height: 40px;
    background-color: #008DA6;
    border-radius: 50%;
    animation: pulse 1.6s infinite;
  }
  @keyframes pulse {
    0% { transform: scale(1); opacity: 0.3; }
    50% { transform: scale(1.8); opacity: 0.1; }
    100% { transform: scale(1); opacity: 0.3; }
  }
`;

const truckSVG = encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
    <circle cx="18" cy="18" r="16" fill="white" stroke="#e5e7eb" stroke-width="1" />
    <g transform="translate(8.2,8) scale(0.85)">
      <path stroke="#008DA6" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M1 3h15v13H1zM16 8h5l2 5v3h-7zM5 18a2 2 0 100 4 2 2 0 000-4zm12 0a2 2 0 100 4 2 2 0 000-4z" />
    </g>
  </svg>
`);

const BusIcon = new L.DivIcon({
  html: `<div class='bus-marker'><img src="data:image/svg+xml,${truckSVG}" /></div>`,
  className: "",
  iconSize: [48, 48],
  iconAnchor: [24, 24],
});

// Helper function untuk mendapatkan koordinat dari stops
function getRouteCoordinates(stops) {
  if (!stops || stops.length === 0) return [];
  return stops.map(stop => [stop.latitude, stop.longitude]);
}

// Helper function untuk mendapatkan nama route dari stops
function getRouteName(stops) {
  if (!stops || stops.length < 2) return '-';
  const firstStop = stops[0].stopName || stops[0].stop_name || 'Unknown';
  const lastStop = stops[stops.length - 1].stopName || stops[stops.length - 1].stop_name || 'Unknown';
  return `${firstStop} → ${lastStop}`;
}

const FlyToBus = ({ position }) => {
  const map = useMap();
  if (position) map.flyTo(position, 8, { duration: 1.5 });
  return null;
};

const TrackingPage = () => {
  const [selectedBus, setSelectedBus] = useState(null);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTrackingData = async () => {
    try {
      setLoading(true);
      const response = await getTrackingData();
      if (response.success && response.data) {
        setBuses(response.data);
        setError(null);
      } else {
        setBuses([]);
      }
    } catch (err) {
      console.error('Error fetching tracking data:', err);
      setError('Gagal memuat data tracking');
      setBuses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Hanya fetch sekali saat component mount
    fetchTrackingData();
  }, []);

  // Calculate center dari semua bus positions
  const getMapCenter = () => {
    if (buses.length === 0) return [-7.0, 110.0];
    const positions = buses.filter(b => b.position).map(b => b.position);
    if (positions.length === 0) return [-7.0, 110.0];
    const avgLat = positions.reduce((sum, p) => sum + p[0], 0) / positions.length;
    const avgLng = positions.reduce((sum, p) => sum + p[1], 0) / positions.length;
    return [avgLat, avgLng];
  };

  if (loading) {
    return (
      <div className="relative h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-textSecondary">Memuat data tracking...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-64px)]">
      <style>{pulseStyle}</style>

      <MapContainer
        center={getMapCenter()}
        zoom={buses.length > 0 ? 8 : 6.5}
        scrollWheelZoom={true}
        className="absolute inset-0 z-0"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        {/* Garis route dari stops */}
        {buses
          .filter(bus => bus.route && bus.route.stops && bus.route.stops.length >= 2)
          .map((bus) => {
            const coordinates = getRouteCoordinates(bus.route.stops);
            return (
              <Polyline
                key={`route-${bus.busId}`}
                positions={coordinates}
                color="#008DA6"
                weight={3}
                opacity={0.6}
              />
            );
          })}

        {/* Bus marker */}
        {buses
          .filter(bus => bus.position)
          .map((bus) => (
            <Marker
              key={bus.busId}
              position={bus.position}
              icon={BusIcon}
              eventHandlers={{
                click: () => setSelectedBus(bus),
              }}
            />
          ))}

        {selectedBus && selectedBus.position && <FlyToBus position={selectedBus.position} />}
      </MapContainer>

      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[50] w-[90%] max-w-4xl">
        <div className="bg-white/90 backdrop-blur-sm border border-gray-100 shadow-md rounded-2xl p-8 text-center transition-all duration-300 hover:shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex-1 text-left">
              <h1 className="text-3xl font-bold text-text tracking-tight">
                Tracking Bus
              </h1>
              <p className="text-textSecondary mt-2 text-base">
                Lihat posisi bus. Klik ikon di peta untuk melihat detail bus.
              </p>
              {buses.length > 0 && (
                <p className="text-textSecondary mt-1 text-sm">
                  {buses.length} bus sedang beroperasi
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedBus && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[60] w-[90%] max-w-lg">
          <div className="bg-white/95 backdrop-blur-sm border border-gray-100 shadow-lg rounded-2xl p-6 animate-fadeIn transform transition-all duration-300 hover:shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-2xl font-bold text-text">
                {selectedBus.bus}
              </h2>
              <button
                onClick={() => setSelectedBus(null)}
                className="px-4 py-2 text-sm font-medium rounded-md bg-secondary text-white hover:opacity-90 transition"
              >
                Tutup
              </button>
            </div>

            <div className="border-t border-gray-200 mb-3"></div>

            <div className="space-y-2 text-base text-textSecondary leading-relaxed">
              <p>
                <strong>Model:</strong> {selectedBus.model}
              </p>
              <p>
                <strong>Kapasitas:</strong> {selectedBus.capacity} penumpang
              </p>
              {selectedBus.route && (
                <p>
                  <strong>Rute:</strong> {selectedBus.route.routeName || getRouteName(selectedBus.route.stops)}
                </p>
              )}
              {selectedBus.route && selectedBus.route.routeCode && (
                <p>
                  <strong>Kode Rute:</strong> {selectedBus.route.routeCode}
                </p>
              )}
              {selectedBus.driver && (
                <>
                  <p>
                    <strong>Supir:</strong> {selectedBus.driver.name}
                  </p>
                  {selectedBus.driver.contact && (
                    <p>
                      <strong>Kontak:</strong> {selectedBus.driver.contact}
                    </p>
                  )}
                </>
              )}
              {selectedBus.schedule && (
                <p>
                  <strong>Jadwal:</strong> {new Date(selectedBus.schedule.time).toLocaleString('id-ID')}
                </p>
              )}
              <p>
                <strong>Status:</strong> <span className={`font-semibold ${selectedBus.status === 'Beroperasi' ? 'text-green-600' : 'text-orange-600'}`}>
                  {selectedBus.status}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackingPage;
