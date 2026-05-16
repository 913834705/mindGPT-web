// src/utils/request.ts
import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

// 定义后端返回的标准错误格式（根据你的 NestJS 异常过滤器来定）
interface BackendErrorResponse {
  message?: string | string[];
  statusCode?: number;
  error?: string;
}

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,// 请确保 vite.config.ts 中配置了代理[cite: 2]
  timeout: 10000,
});

request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

request.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data;
  },
  (error: AxiosError<BackendErrorResponse>) => {
    const responseData = error.response?.data;
    // 处理 NestJS 返回的 class-validator 数组错误或字符串错误[cite: 1]
    const errorMsg = Array.isArray(responseData?.message) 
      ? responseData.message[0] 
      : responseData?.message || '网络请求失败，请稍后重试';
      
    return Promise.reject(new Error(errorMsg));
  }
);

export default request;