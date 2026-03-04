import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyPaymentsApi, downloadInvoiceApi } from '../api/paymentApi';
import { useAuth } from '../context/AuthContext';
import type { PaymentRecord } from '../types';
import '../styles/Payment.css';
import '../styles/Navbar.css';

const fmt = (v: number) =>
  `LKR ${v.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString('en-LK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const typeBadgeClass = (type: string) => {
  if (type === 'ADVANCE')   return 'badge badge-advance';
  if (type === 'FULL')      return 'badge badge-full';
  if (type === 'REMAINING') return 'badge badge-remaining';
  return 'badge';
};

const MyPayments: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    getMyPaymentsApi()
      .then(data => { setPayments(data); setLoading(false); })
      .catch(() => { setError('Failed to load payments.'); setLoading(false); });
  }, []);

  const handleDownload = async (paymentId: number) => {
    setDownloadingId(paymentId);
    try { await downloadInvoiceApi(paymentId); }
    catch { alert('Failed to download invoice.'); }
    finally { setDownloadingId(null); }
  };

  return (
    <div className="my-payments-page">
      <div className="my-payments-container">
        <button
          style={{ background: 'none', border: 'none', color: '#0077b6', cursor: 'pointer', marginBottom: '1rem', fontWeight: 600, fontSize: '0.9rem' }}
          onClick={() => navigate('/guest/dashboard')}
        >
          ← Back to Dashboard
        </button>

        <h1 className="my-payments-title">My Payments</h1>

        {loading && <p style={{ textAlign: 'center', color: '#888' }}>Loading payments…</p>}
        {error   && <p style={{ textAlign: 'center', color: '#c62828' }}>{error}</p>}

        {!loading && !error && payments.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">💳</div>
            <p>No payments found. Make your first booking payment!</p>
            <button
              style={{ marginTop: '1rem', padding: '0.6rem 1.4rem', background: '#023047', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
              onClick={() => navigate('/')}
            >
              Browse Villas
            </button>
          </div>
        )}

        {!loading && payments.length > 0 && (
          <div className="payments-table-wrapper">
            <table className="payments-table">
              <thead>
                <tr>
                  <th>Transaction Ref</th>
                  <th>Booking #</th>
                  <th>Villa</th>
                  <th>Type</th>
                  <th>Method</th>
                  <th>Amount (LKR)</th>
                  <th>Remaining</th>
                  <th>Date</th>
                  <th>Invoice</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#1565c0' }}>
                      {p.transactionReference}
                    </td>
                    <td>#{p.bookingId}</td>
                    <td>{p.villaName}</td>
                    <td><span className={typeBadgeClass(p.paymentType)}>{p.paymentType}</span></td>
                    <td>{p.paymentMethod.replace('_', ' ')}</td>
                    <td style={{ fontWeight: 700, color: '#2e7d32' }}>{fmt(p.amount)}</td>
                    <td style={{ color: p.remainingAmount > 0 ? '#e65100' : '#2e7d32', fontWeight: 600 }}>
                      {fmt(p.remainingAmount)}
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>{formatDate(p.paymentDate)}</td>
                    <td>
                      <button
                        className="btn-invoice-sm"
                        onClick={() => handleDownload(p.id)}
                        disabled={downloadingId === p.id}
                      >
                        {downloadingId === p.id ? '…' : '📄 PDF'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyPayments;
