import React, { useEffect, useState } from 'react';
import { FiSearch, FiCreditCard, FiCheckCircle } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import TicketPurchaseModal from './TicketPurchaseModal';
import Toast from './Toast';
import { searchSchedules, getUserTickets, validateTicket } from '../services/apiService';

const Section = ({ title, description, children }) => (
  <div className="bg-white rounded-xl shadow-sm p-6">
    <h3 className="text-xl font-semibold text-text mb-2">{title}</h3>
    {description && <p className="text-textSecondary mb-4">{description}</p>}
    {children}
  </div>
);

const Field = ({ label, children }) => (
  <label className="block">
    <span className="block text-sm font-medium text-text mb-1">{label}</span>
    {children}
  </label>
);

const TextInput = (props) => (
  <input
    {...props}
    className="w-full border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60"
  />
);

const Select = ({ options = [], ...props }) => (
  <select
    {...props}
    className="w-full border border-gray-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60"
  >
    {options.map((opt) => (
      <option key={opt.value} value={opt.value}>{opt.label}</option>
    ))}
  </select>
);

const ActionButton = ({ children, variant = 'primary', ...props }) => {
  const classes = variant === 'primary'
    ? 'bg-secondary text-white hover:opacity-95'
    : 'border border-primary text-primary hover:bg-primary/10';
  return (
    <button
      {...props}
      type="button"
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${classes}`}
    >
      {children}
    </button>
  );
};

const TicketingPage = () => {
  const [query, setQuery] = useState('');
  const [date, setDate] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState('');
  const [selectedScheduleLabel, setSelectedScheduleLabel] = useState('');
  const [selectedRoute, setSelectedRoute] = useState(null); // Menyimpan data schedule lengkap (dari database)
  const [schedules, setSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [scheduleMsg, setScheduleMsg] = useState('');

  const [ticketCode, setTicketCode] = useState('');
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [validating, setValidating] = useState(false);
  const { requireAuth, isAuthenticated, user } = useAuth();
  const [toast, setToast] = useState({ open: false, type: 'info', message: '' });

  const notify = (type, message) => setToast({ open: true, type, message });
  const closeToast = () => setToast((t) => ({ ...t, open: false }));

  const handleSearchSchedules = async () => {
    if (!query || query.trim().length < 2) {
      setScheduleMsg('Masukkan minimal 2 karakter untuk pencarian.');
      setSchedules([{ value: '', label: '-- pilih jadwal --' }]);
      setSelectedSchedule('');
      return;
    }
    try {
      setLoadingSchedules(true);
      setScheduleMsg('');
      const list = await searchSchedules(query.trim());
      // Simpan list schedules lengkap untuk referensi
      // Schedule sudah ada di database (seperti jadwal penerbangan)
      const schedulesList = Array.isArray(list) ? list : [];
      const opts = [{ value: '', label: '-- pilih jadwal --', schedule: null }].concat(
        schedulesList.map((s) => ({
          value: s.id, // gunakan schedule id dari database
          label: `${s.routeName || s.route_name || 'Rute'} - ${s.busPlate || s.bus || 'Bus'} - ${s.driverName || s.driver || 'Driver'}`,
          schedule: s // simpan data schedule lengkap
        }))
      );
      setSchedules(opts);
      if (opts.length > 1) {
        setSelectedSchedule(opts[1].value);
        setSelectedScheduleLabel(opts[1].label);
        setSelectedRoute(opts[1].schedule); // simpan schedule yang dipilih (dari database)
        setScheduleMsg(`Ditemukan ${opts.length - 1} jadwal.`);
        notify('success', `Berhasil menemukan ${opts.length - 1} jadwal`);
      } else {
        setSelectedSchedule('');
        setSelectedScheduleLabel('');
        setSelectedRoute(null);
        setScheduleMsg('Tidak ada jadwal yang cocok.');
        notify('warning', 'Tidak ada jadwal yang cocok');
      }
    } catch (e) {
      const msg = e?.message || 'Gagal mencari jadwal';
      setScheduleMsg(msg);
      notify('error', msg);
      setSchedules([{ value: '', label: '-- pilih jadwal --', schedule: null }]);
      setSelectedSchedule('');
      setSelectedRoute(null);
    } finally {
      setLoadingSchedules(false);
    }
  };

  const handleOpenPurchase = () => {
    if (!selectedSchedule) {
      alert('Silakan cari dan pilih jadwal terlebih dahulu');
      return;
    }
    requireAuth(() => setPurchaseOpen(true));
  };

  const handleValidate = async () => {
    if (!ticketCode) { notify('warning', 'Masukkan kode tiket'); return; }
    try {
      setValidating(true);
      const res = await validateTicket(ticketCode.trim());
      if (res?.success) {
        notify(res.valid ? 'success' : 'warning', res.valid ? 'Tiket valid' : 'Tiket tidak valid / belum dibayar');
      } else {
        notify('error', res?.message || 'Validasi gagal');
      }
    } catch (e) {
      notify('error', e?.response?.data?.message || e?.message || 'Validasi gagal');
    } finally {
      setValidating(false);
    }
  };

  const loadHistory = async () => {
    if (!user?.id) return setHistory([]);
    try {
      setLoadingHistory(true);
      const res = await getUserTickets(user.id);
      if (res?.success) setHistory(res.data || []);
      else setHistory([]);
    } catch (e) {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-text">Pembelian & Validasi Tiket</h2>
        <p className="text-textSecondary mt-1">Kelola pembelian tiket dan validasi penggunaan tiket Anda.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Cari Jadwal */}
        <Section
          title="Cari Jadwal"
          description="Temukan jadwal keberangkatan yang sesuai."
        >
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Kota / Rute">
              <TextInput
                placeholder="cth: Jakarta - Depok"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </Field>
            <Field label="Tanggal Keberangkatan">
              <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <ActionButton onClick={handleSearchSchedules} disabled={loadingSchedules}>
              <FiSearch /> {loadingSchedules ? 'Mencari...' : 'Cari Jadwal'}
            </ActionButton>
            {scheduleMsg && <span className="text-sm text-textSecondary">{scheduleMsg}</span>}
          </div>
        </Section>

        {/* Pilih Jadwal & Pengguna */}
        <Section
          title="Detail Pembelian"
          description="Pilih jadwal dan pengguna untuk melanjutkan."
        >
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Pilih Jadwal (hasil pencarian)">
              <Select
                value={selectedSchedule}
                onChange={(e) => {
                  const v = e.target.value;
                  setSelectedSchedule(v);
                  const found = schedules.find(s => s.value === v);
                  setSelectedScheduleLabel(found?.label || '');
                  setSelectedRoute(found?.schedule || null); // update schedule yang dipilih (dari database)
                }}
                options={schedules.length ? schedules : [{ value: '', label: '-- pilih jadwal --' }]}
              />
            </Field>
            <Field label="Pengguna">
              <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-textSecondary">
                {isAuthenticated ? (user?.name || user?.email || user?.phone || 'Pengguna') : 'Belum masuk'}
              </div>
            </Field>
          </div>
          <div className="mt-4 flex gap-3">
            <ActionButton onClick={handleOpenPurchase}>
              <FiCreditCard /> Beli Tiket
            </ActionButton>
          </div>
        </Section>

        {/* Validasi Tiket */}
        <Section
          title="Validasi Tiket"
          description="Masukkan kode tiket Anda untuk validasi."
        >
          <div className="grid md:grid-cols-3 gap-4 items-end">
            <Field label="Kode Tiket">
              <TextInput
                placeholder="cth: UUID tiket"
                value={ticketCode}
                onChange={(e) => setTicketCode(e.target.value)}
              />
            </Field>
            <div>
              <ActionButton onClick={handleValidate}>
                <FiCheckCircle /> {validating ? 'Memeriksa...' : 'Validasi'}
              </ActionButton>
            </div>
          </div>
        </Section>

        {/* Riwayat */}
        <Section
          title="Riwayat Tiket"
          description="Lihat pembelian terakhir Anda."
        >
          {loadingHistory ? (
            <p className="text-textSecondary">Memuat riwayat...</p>
          ) : !isAuthenticated ? (
            <p className="text-textSecondary">Masuk untuk melihat riwayat pembelian Anda.</p>
          ) : history.length === 0 ? (
            <p className="text-textSecondary">Anda belum membeli tiket.</p>
          ) : (
            <div className="border border-gray-100 rounded-lg divide-y">
              {history.map((t) => (
                <div key={t.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-textSecondary">Kode</p>
                    <p className="font-medium text-text">{t.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-textSecondary">Jadwal</p>
                    <p className="font-medium text-text">{t.schedule_label || `schedule-${t.schedule_id}`}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs ${t.status === 'success' ? 'bg-green-100 text-green-700' : t.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{t.status}</span>
                    <p className="text-xs text-textSecondary mt-1">Rp {Number(t.amount).toLocaleString('id-ID')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
      {/* Modal Pembelian */}
      <TicketPurchaseModal
        open={purchaseOpen}
        onClose={() => { setPurchaseOpen(false); if (isAuthenticated) loadHistory(); }}
        scheduleId={selectedSchedule}
        scheduleLabel={selectedScheduleLabel}
        route={selectedRoute}
        date={date}
        onNotify={notify}
      />
      <Toast open={toast.open} type={toast.type} message={toast.message} onClose={closeToast} />
    </div>
  );
};

export default TicketingPage;


