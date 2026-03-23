import axiosInstance from './axiosInstance';
import type { PaymentProcessRequest, PaymentRecord, RevenueAnalytics } from '../types';

// ── GUEST ──────────────────────────────────────────────────────────────────────

export const processPaymentApi = (data: PaymentProcessRequest): Promise<PaymentRecord> => {
  // BANK_TRANSFER → multipart/form-data
  if (data.paymentMethod === 'BANK_TRANSFER') {
    const form = new FormData();
    form.append('bookingId', String(data.bookingId));
    form.append('paymentType', data.paymentType);
    form.append('paymentMethod', data.paymentMethod);
    if (data.bankTransferFile) {
      form.append('file', data.bankTransferFile);
    }

    return axiosInstance.post('/payments/pay', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  }

  // CASH / CARD → JSON
  const payload: Omit<PaymentProcessRequest, 'bankTransferFile'> = {
    bookingId: data.bookingId,
    paymentType: data.paymentType,
    paymentMethod: data.paymentMethod,
    cardNumber: data.cardNumber,
    cardType: data.cardType,
    expiryDate: data.expiryDate,
    cvv: data.cvv,
  };
  return axiosInstance.post('/payments/pay', payload).then(r => r.data);
};

export const getMyPaymentsApi = (): Promise<PaymentRecord[]> =>
  axiosInstance.get('/payments/my').then(r => r.data);

export const downloadInvoiceApi = async (paymentId: number): Promise<void> => {
  const response = await axiosInstance.get(`/payments/${paymentId}/invoice`, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `invoice-${paymentId}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// ── ADMIN ──────────────────────────────────────────────────────────────────────

export const getAllPaymentsApi = (): Promise<PaymentRecord[]> =>
  axiosInstance.get('/admin/payments').then(r => r.data);

export const getRevenueAnalyticsApi = (): Promise<RevenueAnalytics> =>
  axiosInstance.get('/admin/analytics/revenue').then(r => r.data);
