import axiosInstance from './axiosInstance';
import type { Villa, VillaRequest } from '../types';

// Public
export const getAllVillasApi = (): Promise<Villa[]> =>
  axiosInstance.get('/villas').then(r => r.data);

export const getVillaByIdApi = (id: number): Promise<Villa> =>
  axiosInstance.get(`/villas/${id}`).then(r => r.data);

// Admin
export const addVillaApi = (data: VillaRequest): Promise<Villa> =>
  axiosInstance.post('/admin/villas', data).then(r => r.data);

export const updateVillaApi = (id: number, data: VillaRequest): Promise<Villa> =>
  axiosInstance.put(`/admin/villas/${id}`, data).then(r => r.data);

export const deleteVillaApi = (id: number): Promise<void> =>
  axiosInstance.delete(`/admin/villas/${id}`).then(r => r.data);
