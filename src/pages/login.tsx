// src/pages/Login.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore, { RegisterDto } from '../store/authStore';

const Login: React.FC = () => {
  const [isLoginView, setIsLoginView] = useState<boolean>(true);
  const [formData, setFormData] = useState<RegisterDto>({ email: 'test@example.com', password: '123456', name: '' });
  
  const { login, register, isLoading, error, clearError, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/chat');
    }
  }, [isAuthenticated, navigate]);

  // 给 e 加上 React.ChangeEvent 的泛型类型
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) clearError();
  };

  // 给 e 加上 React.FormEvent 类型
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoginView) {
      const success = await login({ email: formData.email, password: formData.password });
      if (success) navigate('/chat');
    } else {
      const success = await register(formData);
      if (success) {
        setIsLoginView(true);
        alert('注册成功，请登录！');
      }
    }
  };

  return (
    // 外层容器：深色背景，隐藏溢出用于放置发光球体
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* 氛围光晕效果 (紫色霓虹光) */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-900/40 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-900/30 rounded-full blur-[120px] pointer-events-none"></div>

      {/* 登录卡片：毛玻璃质感 */}
      <div className="max-w-md w-full space-y-8 bg-white/5 backdrop-blur-xl p-10 rounded-3xl shadow-2xl border border-white/10 relative z-10">
        
        {/* Header */}
        <div>
          <h2 className="mt-2 text-center text-3xl font-extrabold text-white tracking-tight">
            {isLoginView ? '欢迎回来！!' : '开启新旅程！！'}
          </h2>
          <p className="mt-3 text-center text-sm text-purple-200/60">
            {isLoginView ? '请登录以继续探索系统' : '填写以下信息加入我们'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-sm text-center backdrop-blur-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-5">
            {!isLoginView && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">用户名</label>
                <input
                  name="name"
                  type="text"
                  required={!isLoginView}
                  className="appearance-none block w-full px-4 py-3 bg-[#13131a]/80 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent sm:text-sm transition-all"
                  placeholder="请输入您的昵称"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">邮箱</label>
              <input
                name="email"
                type="email"
                required
                className="appearance-none block w-full px-4 py-3 bg-[#13131a]/80 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent sm:text-sm transition-all"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">密码</label>
              <input
                name="password"
                type="password"
                required
                className="appearance-none block w-full px-4 py-3 bg-[#13131a]/80 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent sm:text-sm transition-all"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0a0a0f] focus:ring-purple-500 transition-all shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '验证中...' : (isLoginView ? '立即登录' : '注册账号')}
            </button>
          </div>
        </form>

        {/* Toggle Mode */}
        <div className="text-center mt-6">
          <button
            type="button"
            onClick={() => {
              setIsLoginView(!isLoginView);
              clearError();
            }}
            className="text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors"
          >
            {isLoginView ? '没有账号？点击注册' : '已有账号？返回登录'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;