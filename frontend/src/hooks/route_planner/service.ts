import axios, { AxiosInstance } from "axios";
import { RoutePlanRequest, RoutePlanResponse } from "./types";

const BASE_URL = import.meta.env.VITE_BASE_BACKEND_URL || "http://localhost:8001";

const apiClient: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

export const routePlannerService = {
  planRoute: async (data: RoutePlanRequest): Promise<RoutePlanResponse> => {
    const response = await apiClient.post<RoutePlanResponse>("/route-plan/", data);
    return response.data;
  },
};
