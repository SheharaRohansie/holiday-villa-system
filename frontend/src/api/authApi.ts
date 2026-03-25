import axiosInstance from './axiosInstance';
import type { AuthResponse, LoginRequest, MessageResponse, RegisterRequest, RegisterWithOtpRequest } from '../types';

export const loginApi = async (data: LoginRequest): Promise<AuthResponse> => {
  const response = await axiosInstance.post<AuthResponse>('/auth/login', data);
  return response.data;
};

export const sendRegistrationOtpApi = async (email: string): Promise<MessageResponse> => {
  const response = await axiosInstance.post<MessageResponse>('/auth/send-otp', { email });
  return response.data;
};

export const registerWithOtpApi = async (data: RegisterWithOtpRequest): Promise<MessageResponse> => {
  const response = await axiosInstance.post<MessageResponse>('/auth/register', data);
  return response.data;
};

export const sendForgotPasswordOtpApi = async (email: string): Promise<MessageResponse> => {
  const response = await axiosInstance.post<MessageResponse>('/auth/forgot-password/send-otp', { email });
  return response.data;
};

export const resetPasswordApi = async (data: { email: string; otp: string; newPassword: string }): Promise<MessageResponse> => {
  const response = await axiosInstance.post<MessageResponse>('/auth/forgot-password/reset', data);
  return response.data;
};

export const refreshTokenApi = async (): Promise<{ token: string }> => {
  const response = await axiosInstance.post<{ token: string }>('/auth/refresh');
  return response.data;
};
