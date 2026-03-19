import axiosInstance from './axiosInstance';
import type { AuthResponse, LoginRequest, RegisterRequest } from '../types';

export const loginApi = async (data: LoginRequest): Promise<AuthResponse> => {
  const response = await axiosInstance.post<AuthResponse>('/auth/login', data);
  return response.data;
};

export const registerApi = async (data: RegisterRequest): Promise<AuthResponse> => {
  const response = await axiosInstance.post<AuthResponse>('/auth/register', data);
  return response.data;
};

export const refreshTokenApi = async (): Promise<{ token: string }> => {
  const response = await axiosInstance.post<{ token: string }>('/auth/refresh');
  return response.data;
};
