import axiosInstance from './axiosInstance';
import type {
  Review,
  ReviewRequest,
  ReviewUpdateRequest,
  VillaReviewsResponse,
} from '../types';

// ── Guest ──────────────────────────────────────────────────────────────────────

export const submitReviewApi = (data: ReviewRequest): Promise<Review> =>
  axiosInstance.post('/reviews', data).then(r => r.data);

export const updateReviewApi = (reviewId: number, data: ReviewUpdateRequest): Promise<Review> =>
  axiosInstance.put(`/reviews/${reviewId}`, data).then(r => r.data);

export const deleteMyReviewApi = (reviewId: number): Promise<void> =>
  axiosInstance.delete(`/reviews/${reviewId}`).then(() => undefined);

export const getMyReviewsApi = (): Promise<Review[]> =>
  axiosInstance.get('/reviews/my').then(r => r.data);

// ── Public ─────────────────────────────────────────────────────────────────────

export const getVillaReviewsApi = (villaId: number): Promise<VillaReviewsResponse> =>
  axiosInstance.get(`/reviews/villa/${villaId}`).then(r => r.data);

// ── Admin ──────────────────────────────────────────────────────────────────────

export const getAllReviewsApi = (): Promise<Review[]> =>
  axiosInstance.get('/admin/reviews').then(r => r.data);
