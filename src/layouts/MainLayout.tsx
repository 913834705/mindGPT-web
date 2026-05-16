// src/layouts/MainLayout.tsx
import React, { useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Database, MessageSquare, Settings, LogOut, BrainCircuit, Plus, Trash2, MessageCircle } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { useAppStore } from '../store';

const MainLayout: React.FC = () => {
  const logout = useAuthStore(state => state.logout);
  const user = useAuthStore(state => state.user);
  const navigate = useNavigate();
  const location = useLocation();

  // 从 Store 中引入会话相关的状态和动作
  const { 
    sessions, 
    currentSessionId, 
    fetchSessions, 
    prepareNewSession, 
    setCurrentSession, 
    deleteSession 
  } = useAppStore();

  // 组件挂载时拉取会话列表
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCreateSession = () => {
    prepareNewSession(); // 前端重置状态，不清空历史，只准备新对话
    navigate('/chat');
  };

  const handleSelectSession = (id: number) => {
    setCurrentSession(id);
    if (location.pathname !== '/chat') {
      navigate('/chat');
    }
  };

  const handleDeleteSession = (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); // 防止触发选中事件
    if (window.confirm('确定要删除这个对话吗？')) {
      deleteSession(id);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#0a0a0f] text-gray-200">
      {/* 侧边栏：采用更深色的设计，右侧带细微边框 */}
      <aside className="w-64 bg-[#0f0f15] border-r border-white/5 flex flex-col z-20">
        <div className="h-20 flex shrink-0 items-center px-6">
          <div className="p-2 bg-purple-600 rounded-lg shadow-lg shadow-purple-600/20 mr-3">
            <BrainCircuit className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            MindGPT
          </h1>
        </div>
        
        <nav className="flex-1 px-4 py-4 flex flex-col min-h-0 overflow-hidden">
          <div className="space-y-2 mb-6 shrink-0">
            <MenuLink to="/knowledge-base" icon={<Database size={18} />} label="知识库管理" />
            <MenuLink to="/chat" icon={<MessageSquare size={18} />} label="AI 智能对话" />
          </div>

          {/* 会话列表区域 */}
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col min-h-0" style={{ scrollbarWidth: 'thin', scrollbarColor: '#4b5563 transparent' }}>
            <div className="flex items-center justify-between mb-3 px-2 shrink-0">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">历史对话</span>
              <button 
                onClick={handleCreateSession}
                className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                title="新建对话"
              >
                <Plus size={16} />
              </button>
            </div>
            
            <div className="space-y-1 flex-1">
              {sessions.map((session: any) => (
                <div 
                  key={session.id}
                  onClick={() => handleSelectSession(session.id)}
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 ${
                    currentSessionId === session.id 
                      ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30' 
                      : 'text-gray-400 hover:bg-white/5 hover:text-gray-200 border border-transparent'
                  }`}
                >
                  <div className="flex items-center truncate max-w-[85%]">
                    <MessageCircle size={14} className="mr-2.5 shrink-0 opacity-70" />
                    <span className="text-sm truncate">{session.title}</span>
                  </div>
                  <button 
                    onClick={(e) => handleDeleteSession(e, session.id)}
                    className={`p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 transition-all shrink-0 ${
                      currentSessionId === session.id ? 'text-purple-400' : 'text-gray-500'
                    }`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </nav>

        {/* 用户信息与设置区域 */}
        <div className="p-4 border-t border-white/5 space-y-2">
          <button className="flex items-center w-full px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
            <Settings className="w-4 h-4 mr-3" />
            系统设置
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2 text-sm text-red-400/80 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
          >
            <LogOut className="w-4 h-4 mr-3" />
            退出登录
          </button>
          
          <div className="mt-4 flex items-center px-3 py-3 bg-white/5 rounded-xl border border-white/5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-xs font-bold shadow-inner">
              {user?.name?.[0] || 'U'}
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-xs font-medium text-white truncate">{user?.name || '未命名用户'}</p>
              <p className="text-[10px] text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 relative flex flex-col h-full bg-[#0d0d12]">
        {/* 背景装饰：紫色光晕 */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[120px] pointer-events-none animate-pulse-glow" />
        <Outlet />
      </main>
    </div>
  );
};

// 辅助组件：导航链接
const MenuLink = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => (
  <NavLink 
    to={to} 
    className={({ isActive }) => 
      `flex items-center px-4 py-3 rounded-xl transition-all duration-300 group ${
        isActive 
          ? 'bg-purple-600/10 text-purple-400 border border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.1)]' 
          : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
      }`
    }
  >
    <span className="mr-3 transition-transform group-hover:scale-110">{icon}</span>
    <span className="text-sm font-medium">{label}</span>
  </NavLink>
);

export default MainLayout;