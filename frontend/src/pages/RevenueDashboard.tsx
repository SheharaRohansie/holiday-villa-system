import React, { useCallback, useEffect, useState } from 'react';
import {
  Tooltip,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { getRevenueAnalyticsApi, getAllPaymentsApi, downloadInvoiceApi, markPaymentAsPaidApi } from '../api/paymentApi';
import type { RevenueAnalytics, PaymentRecord } from '../types';
import '../styles/Payment.css';

const fmt = (v: number | undefined) =>
  v === undefined ? '' : `LKR ${v.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtShort = (v: number | undefined) =>
  v === undefined
    ? ''
    : v >= 1_000_000
    ? `LKR ${(v / 1_000_000).toFixed(2)}M`
    : v >= 1000
    ? `LKR ${(v / 1000).toFixed(1)}K`
    : `LKR ${v.toFixed(0)}`;

const PIE_COLORS = ['#023047', '#ffb703'];

const typeBadgeClass = (type: string) => {
  if (type === 'ADVANCE')   return 'badge badge-advance';
  if (type === 'FULL')      return 'badge badge-full';
  if (type === 'REMAINING') return 'badge badge-remaining';
  if (type === 'CANCELLED') return 'badge badge-failed';
  return 'badge';
};

const displayPaymentType = (p: PaymentRecord) => {
  if (p.bookingStatus === 'CANCELLED') return 'CANCELLED';
  if (p.paymentType === 'REMAINING' && p.bookingPaymentStatus === 'FULLY_PAID' && p.remainingAmount === 0) return 'FULL';
  return p.paymentType;
};

const formatDt = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString('en-LK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const RevenueDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<RevenueAnalytics | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [markingPaidId, setMarkingPaidId] = useState<number | null>(null);

  const refresh = useCallback(async (opts?: { showSpinner?: boolean }) => {
    const showSpinner = opts?.showSpinner ?? false;
    if (showSpinner) setLoading(true);
    else setRefreshing(true);
    try {
      const [a, p] = await Promise.all([getRevenueAnalyticsApi(), getAllPaymentsApi()]);
      setAnalytics(a);
      setPayments(p);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh({ showSpinner: true });

    const onFocus = () => void refresh();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void refresh();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    const poll = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 15000);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(poll);
    };
  }, [refresh]);

  // On some layouts, ResponsiveContainer can measure width/height before the grid
  // settles; a couple delayed resizes makes the BarChart consistently appear.
  useEffect(() => {
    const delays = [50, 250, 750];
    const ids = delays.map(ms => window.setTimeout(() => window.dispatchEvent(new Event('resize')), ms));
    return () => ids.forEach(id => window.clearTimeout(id));
  }, []);

  const handleDownload = async (paymentId: number) => {
    setDownloadingId(paymentId);
    try { await downloadInvoiceApi(paymentId); }
    catch { alert('Failed to download invoice.'); }
    finally { setDownloadingId(null); }
  };

  const handleMarkPaid = async (paymentId: number) => {
    setMarkingPaidId(paymentId);
    try {
      await markPaymentAsPaidApi(paymentId);
      await refresh();
    } catch {
      alert('Failed to mark as paid.');
    } finally {
      setMarkingPaidId(null);
    }
  };

  if (loading && !analytics) return <div className="revenue-loading">Loading analytics…</div>;
  if (!analytics) return <div className="revenue-loading" style={{ color: '#c62828' }}>Failed to load analytics.</div>;

  const pieData = [
    { name: 'Completed Payments (Paid)', value: analytics.totalRevenue || 0 },
    { name: 'Remaining to Pay (Outstanding)', value: analytics.totalOutstandingBalance || 0 },
  ].filter(d => d.value > 0);

  return (
    <div className="revenue-dashboard">
      <div className="revenue-title">Revenue Analytics</div>
      {refreshing && (
        <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '0.75rem' }}>Refreshing…</div>
      )}

      {/* ── KPI Cards ── */}
      <div className="stat-cards-grid">
        <div className="stat-card green">
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value lkr">{fmtShort(analytics.totalRevenue || 0)}</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Advance Payments</div>
          <div className="stat-value lkr">{fmtShort(analytics.totalAdvancePayments || 0)}</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-label">Remaining Payments</div>
          <div className="stat-value lkr">{fmtShort(analytics.totalRemainingPayments || 0)}</div>
        </div>
        <div className="stat-card teal">
          <div className="stat-label">Full Payments</div>
          <div className="stat-value lkr">{fmtShort(analytics.totalFullPayments || 0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Bookings</div>
          <div className="stat-value">{analytics.totalBookings}</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Completed Bookings</div>
          <div className="stat-value">{analytics.totalCompletedBookings}</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-label">Partially Paid</div>
          <div className="stat-value">{analytics.totalPendingPayments}</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-label">Total Discounts Given</div>
          <div className="stat-value lkr">{fmtShort(analytics.totalDiscountGiven || 0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Revenue Before Discounts</div>
          <div className="stat-value lkr">{fmtShort(analytics.revenueBeforeDiscount || 0)}</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Revenue After Discounts</div>
          <div className="stat-value lkr">{fmtShort(analytics.revenueAfterDiscount || 0)}</div>
        </div>
        <div className="stat-card teal">
          <div className="stat-label">Bookings with Promotion</div>
          <div className="stat-value">{analytics.bookingsWithPromotion || 0}</div>
        </div>
        {analytics.mostUsedPromotion && (
          <div className="stat-card green" style={{ gridColumn: 'span 2' }}>
            <div className="stat-label">Most Used Promotion</div>
            <div className="stat-value" style={{ fontSize: '1rem' }}>{analytics.mostUsedPromotion}</div>
          </div>
        )}
      </div>

      {/* ── Charts ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Completed vs Remaining Pie Chart */}
        <div className="chart-section" style={{ minWidth: 260 }}>
          <h3>Paid vs Outstanding</h3>
          {pieData.length === 0 ? (
            <p style={{ color: '#aaa', textAlign: 'center', padding: '2rem' }}>No data yet.</p>
          ) : (
            <PieChart width={240} height={260}>
              <Pie
                data={pieData}
                cx={110}
                cy={110}
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Legend iconSize={10} wrapperStyle={{ fontSize: '0.8rem' }} />
              <Tooltip formatter={(v: number | undefined) => fmt(v)} />
            </PieChart>
          )}
        </div>
      </div>

      {/* ── All Payments Table ── */}
      <div className="payments-admin-section">
        <h3>All Payments ({payments.length})</h3>
        {payments.length === 0 ? (
          <div className="empty-state"><p>No payments recorded yet.</p></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="payments-table">
              <thead>
                <tr>
                  <th>Transaction Ref</th>
                  <th>Booking #</th>
                  <th>Guest</th>
                  <th>Villa</th>
                  <th>Type</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Invoice</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#1565c0' }}>
                      {p.transactionReference}
                    </td>
                    <td>#{p.bookingId}</td>
                    <td>{p.guestName}</td>
                    <td>{p.villaName}</td>
                    <td>
                      {(() => {
                        const displayType = displayPaymentType(p);
                        return <span className={typeBadgeClass(displayType)}>{displayType}</span>;
                      })()}
                    </td>
                    <td>{p.paymentMethod.replace('_', ' ')}</td>
                    <td style={{ fontWeight: 700, color: p.paymentStatus === 'SUCCESS' ? '#2e7d32' : p.paymentStatus === 'PENDING' ? '#ef6c00' : '#c62828' }}>
                      {p.paymentStatus}
                    </td>
                    <td style={{ fontWeight: 700, color: '#2e7d32' }}>
                      {fmt(p.amount)}
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>{formatDt(p.paymentDate)}</td>
                    <td>
                      <button
                        className="btn-invoice-sm"
                        onClick={() => handleDownload(p.id)}
                        disabled={downloadingId === p.id || p.paymentStatus !== 'SUCCESS'}
                      >
                        {downloadingId === p.id ? '…' : '📄 PDF'}
                      </button>
                    </td>
                    <td>
                      {p.paymentMethod === 'CASH' && p.paymentType === 'REMAINING' && p.paymentStatus === 'PENDING' ? (
                        <button
                          className="btn-invoice-sm"
                          onClick={() => handleMarkPaid(p.id)}
                          disabled={markingPaidId === p.id}
                        >
                          {markingPaidId === p.id ? '…' : 'Mark as Paid'}
                        </button>
                      ) : (
                        <span style={{ color: '#aaa' }}>—</span>
                      )}
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

export default RevenueDashboard;
