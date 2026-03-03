import axiosInstance from './axiosInstance';
import type { CreateStaffRequest, UpdateProfileRequest, UserResponse } from '../types';

export const getAllUsersApi = async (): Promise<UserResponse[]> => {
  const response = await axiosInstance.get<UserResponse[]>('/admin/users');
  return response.data;
};

export const getAllStaffApi = async (): Promise<UserResponse[]> => {
  const response = await axiosInstance.get<UserResponse[]>('/admin/staff');
  return response.data;
};

export const getAllGuestsApi = async (): Promise<UserResponse[]> => {
  const response = await axiosInstance.get<UserResponse[]>('/admin/guests');
  return response.data;
};

export const createStaffApi = async (data: CreateStaffRequest): Promise<UserResponse> => {
  const response = await axiosInstance.post<UserResponse>('/admin/staff', data);
  return response.data;
};

export const deleteUserApi = async (id: number): Promise<void> => {
  await axiosInstance.delete(`/admin/users/${id}`);
};

export const getUserByIdApi = async (id: number): Promise<UserResponse> => {
  const response = await axiosInstance.get<UserResponse>(`/user/${id}`);
  return response.data;
};

export const updateProfileApi = async (id: number, data: UpdateProfileRequest): Promise<UserResponse> => {
  const response = await axiosInstance.put<UserResponse>(`/user/${id}/profile`, data);
  return response.data;
};
