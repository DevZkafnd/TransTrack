import React, { useState } from 'react';
import { createTicket, updateTicketStatus } from '../services/apiService';
import { useAuth } from '../context/AuthContext';

const Backdrop = ({ onClose }) => (
  <div className="fixed inset-0 bg-black/30" onClick={onClose} />
);

const Modal = ({ children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
      {children}
    </div>
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

const SubmitButton = ({ children }) => (
  <button type="submit" className="w-full bg-secondary text-white rounded-md py-2.5 font-medium hover:opacity-95">
    {children}
  </button>
);

const TicketPurchaseModal = ({ open, onClose, scheduleId, scheduleLabel, route, date, onNotify }) => {
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [notes, setNotes] = useState('');
  const [amount, setAmount] = useState(20000);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  if (!open) return null;

  const onSubmit = async (e) => {
    e.preventDefault();
    // Validasi: scheduleId wajib ada (schedule harus dipilih dari database)
    if (!scheduleId || scheduleId.trim() === '') {
      onNotify?.('error', 'Pilih jadwal terlebih dahulu. Jadwal harus dipilih dari daftar yang tersedia.');
      return;
    }
    if (!user?.id) {
      onNotify?.('error', 'Anda belum login. Silakan login terlebih dahulu.');
      return;
    }
    try {
      setSubmitting(true);
      // 1) Buat tiket pending di TicketService (via Gateway)
      // TicketService akan memvalidasi user dengan memanggil UserService secara otomatis
      // scheduleId harus dari schedule yang sudah ada di database
      // Tidak membuat schedule baru, hanya membeli tiket untuk schedule yang sudah ada
      const ticketRes = await createTicket({
        userId: user.id,
        scheduleId: scheduleId, // ID schedule dari database (wajib ada)
        scheduleLabel: scheduleLabel || route?.routeName || route?.route_name || 'Rute',
        amount: Number(amount),
        currency: 'IDR'
      });
      
      if (ticketRes?.success) {
        // 2) Tandai tiket sukses (tanpa payment gateway eksternal, via Gateway)
        await updateTicketStatus(ticketRes.data.id, {
          status: 'success',
          paymentRef: paymentMethod
        });
        
        // Catatan: Schedule TIDAK dibuat saat pembelian tiket
        // Schedule sudah ada di database (seperti jadwal penerbangan pesawat)
        // User hanya membeli tiket untuk schedule yang sudah ada
        // Jadwal yang sedang beroperasi tidak bertambah ketika user membeli tiket
        
        onNotify?.('success', 'Pembayaran berhasil! Tiket Anda telah ditambahkan ke jadwal aktif.');
        onClose?.();
      } else {
        onNotify?.('error', ticketRes?.message || 'Gagal membuat tiket');
      }
    } catch (err) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Gagal membuat tiket';
      // Handle khusus untuk error validasi user
      if (err?.response?.status === 404 && errorMessage.includes('tidak ditemukan')) {
        onNotify?.('error', 'User tidak ditemukan. Silakan login kembali.');
      } else if (err?.response?.status === 503) {
        onNotify?.('error', 'Service tidak tersedia. Silakan coba lagi nanti.');
      } else {
        onNotify?.('error', errorMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Backdrop onClose={onClose} />
      <Modal>
        <div className="p-6">
          <h3 className="text-xl font-semibold text-text mb-2">Form Pembelian Tiket</h3>
          <p className="text-textSecondary mb-4">Isi detail berikut untuk melanjutkan pembelian.</p>
          <form className="space-y-4" onSubmit={onSubmit}>
            <Field label="Harga (IDR)">
              <TextInput type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Field>
            <Field label="Metode Pembayaran">
              <Select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                options={[
                  { value: 'wallet', label: 'Dompet Digital' },
                  { value: 'card', label: 'Kartu Kredit/Debit' },
                  { value: 'transfer', label: 'Transfer Bank' },
                ]}
              />
            </Field>
            <Field label="Catatan (opsional)">
              <TextInput
                placeholder="Permintaan khusus kursi, dsb."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
            <SubmitButton>{submitting ? 'Memproses...' : 'Bayar Sekarang'}</SubmitButton>
          </form>
        </div>
      </Modal>
    </>
  );
};

export default TicketPurchaseModal;


