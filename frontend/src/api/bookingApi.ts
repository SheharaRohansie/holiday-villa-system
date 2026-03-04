import axiosInstance from './axiosInstance';
import type { Booking, BookingRequest, PaymentRequest } from '../types';

// Guest
export const createBookingApi = (data: BookingRequest): Promise<Booking> =>
  axiosInstance.post('/bookings', data).then(r => r.data);

export const processPaymentApi = (bookingId: number, data: PaymentRequest): Promise<Booking> =>
  axiosInstance.post(`/bookings/${bookingId}/pay`, data).then(r => r.data);

export const getMyBookingsApi = (): Promise<Booking[]> =>
  axiosInstance.get('/bookings/my').then(r => r.data);

export const getBookingByIdApi = (bookingId: number): Promise<Booking> =>
  axiosInstance.get(`/bookings/${bookingId}`).then(r => r.data);

export const cancelBookingApi = (bookingId: number): Promise<Booking> =>
  axiosInstance.put(`/bookings/${bookingId}/cancel`).then(r => r.data);

// Admin
export const getAllBookingsApi = (): Promise<Booking[]> =>
  axiosInstance.get('/admin/bookings').then(r => r.data);

export const completePaymentApi = (bookingId: number): Promise<Booking> =>
  axiosInstance.put(`/admin/bookings/${bookingId}/complete-payment`).then(r => r.data);
