import axiosInstance from "./axiosInstance";

export type PredictResponse = {
  chalet_name: string;
  year_month: string;
  predicted_occupancy_pct: number;
  ci_low: number;
  ci_high: number;
  predicted_revenue: number;
};

export type HistoryPoint = {
  year_month: string;
  occupancy_pct: number;
  revenue: number;
  bookings: number;
};

export const predict = async (chalet: string, yearMonth: string) => {
  const { data } = await axiosInstance.post<PredictResponse>("/ml/predict", {
    chalet_name: chalet,
    year_month: yearMonth,
  }, { timeout: 300000 });
  return data;
};

export const getHistory = async (chalet: string) => {
  const { data } = await axiosInstance.get<HistoryPoint[]>(`/ml/history/${encodeURIComponent(chalet)}`, { timeout: 300000 });
  return data;
};