// src/store/authStore.ts
import { create } from 'zustand';
import request from '../utils/request';

// 1. 定义数据类型 (建议与后端的 dto 和 entity 保持一致[cite: 1])
export interface User {
  id?: number | string;
  email: string;
  name?: string;
  [key: string]: any; // 扩展其他可能存在的用户字段
}

export interface LoginDto {
  email: string;
  password?: string; // 密码不应保存在 store 中，仅用于入参
}

export interface RegisterDto extends LoginDto {
  name: string;
}

// 2. 定义 Zustand Store 的状态和动作接口
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (credentials: LoginDto) => Promise<boolean>;
  register: (userInfo: RegisterDto) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

// 3. 创建强类型 Store
const useAuthStore = create<AuthState & AuthActions>((set) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: false,
  error: null,

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      // 明确声明泛型返回类型
      const data = await request.post<{ access_token: string; user: User }>('/auth/login', credentials);
      
      // 注意：由于上面 request 拦截器直接返回了 data，这里的强类型声明是为了让 TypeScript 知道返回值的结构
      const typedData = data as any; 
      
      localStorage.setItem('token', typedData.access_token);
      localStorage.setItem('user', JSON.stringify(typedData.user || {}));
      
      set({ 
        user: typedData.user, 
        token: typedData.access_token, 
        isAuthenticated: true, 
        isLoading: false 
      });
      return true;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  register: async (userInfo) => {
    set({ isLoading: true, error: null });
    try {
      await request.post('/auth/register', userInfo);
      set({ isLoading: false });
      return true; 
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  clearError: () => set({ error: null })
}));

export default useAuthStore;