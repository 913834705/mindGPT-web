import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import KnowledgeBase from './pages/KnowledgeBase';
import Chat from './pages/Chat';
import './index.css';
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<MainLayout />}>
            <Route path="knowledge-base" element={<KnowledgeBase />} />
            <Route path="chat" element={<Chat />} />
          </Route>
        </Route>
        {/* 捕获错误路由 */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;