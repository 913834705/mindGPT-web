// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const ProtectedRoute: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // 如果未登录，重定向到 /login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 如果已登录，渲染子路由（通常是包裹在 MainLayout 中的页面）
  return <Outlet />;
};

export default ProtectedRoute;