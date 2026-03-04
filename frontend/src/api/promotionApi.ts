import axiosInstance from './axiosInstance';
import type { Promotion, PromotionRequest, ApplicablePromotion } from '../types';

// ── Admin endpoints ────────────────────────────────────────────────────────

export const createPromotionApi = (data: PromotionRequest): Promise<Promotion> =>
  axiosInstance.post('/admin/promotions', data).then(r => r.data);

export const updatePromotionApi = (id: number, data: PromotionRequest): Promise<Promotion> =>
  axiosInstance.put(`/admin/promotions/${id}`, data).then(r => r.data);

export const deletePromotionApi = (id: number): Promise<void> =>
  axiosInstance.delete(`/admin/promotions/${id}`).then(r => r.data);

export const getAllPromotionsApi = (): Promise<Promotion[]> =>
  axiosInstance.get('/admin/promotions').then(r => r.data);

// ── Public endpoints ───────────────────────────────────────────────────────

export const getActivePromotionsApi = (): Promise<Promotion[]> =>
  axiosInstance.get('/promotions/active').then(r => r.data);

/**
 * Returns the applicable promotion with prices, or null if none.
 */
export const getApplicablePromotionApi = (
  villaId: number,
  checkIn: string,
  checkOut: string
): Promise<ApplicablePromotion | null> =>
  axiosInstance
    .get('/promotions/applicable', { params: { villaId, checkIn, checkOut } })
    .then(r => r.data)
    .catch(err => {
      // 204 No Content → axios may throw; return null
      if (err?.response?.status === 204) return null;
      throw err;
    });
