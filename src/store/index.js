import { create } from 'zustand';
import request from '../utils/request';

export const useAppStore = create((set, get) => ({
  // 知识库数据
  documents:[],
  
  // 会话列表相关状态
  sessions: [],
  currentSessionId: null,
  
  // 聊天记录
  messages:[],

  // --- 会话相关动作 ---

  // 1. 获取所有会话
  fetchSessions: async () => {
    try {
      const data = await request.get('/chat/sessions');
      set({ sessions: data });
      // 如果当前没有选中的会话，且列表不为空，默认选中第一个
      if (!get().currentSessionId && data.length > 0) {
        get().setCurrentSession(data[0].id);
      }
    } catch (error) {
      console.error('获取会话失败:', error);
    }
  },

  // 2. 设置当前会话，并加载历史消息
  setCurrentSession: async (sessionId) => {
    set({ currentSessionId: sessionId, messages: [] });
    if (sessionId) {
      try {
        const data = await request.get(`/chat/session/${sessionId}/messages`);
        set({ messages: data });
      } catch (error) {
        console.error('获取历史消息失败:', error);
      }
    }
  },

  // 3. 准备新会话 (仅在前端重置状态，不发请求)
  prepareNewSession: () => {
    set({ currentSessionId: null, messages: [] });
  },

  // 4. 真正创建新会话 (与后端通信)
  createSession: async (title = '新对话') => {
    try {
      const newSession = await request.post('/chat/session', { title });
      set((state) => ({ 
        sessions: [newSession, ...state.sessions],
        currentSessionId: newSession.id,
      }));
      return newSession.id;
    } catch (error) {
      console.error('创建会话失败:', error);
      return null;
    }
  },

  // 5. 删除会话
  deleteSession: async (sessionId) => {
    try {
      await request.delete(`/chat/session/${sessionId}`);
      set((state) => {
        const newSessions = state.sessions.filter(s => s.id !== sessionId);
        let nextSessionId = state.currentSessionId;
        
        // 如果删掉的是当前选中的，则切换到第一个或者清空
        if (state.currentSessionId === sessionId) {
          nextSessionId = newSessions.length > 0 ? newSessions[0].id : null;
        }
        
        return { sessions: newSessions, currentSessionId: nextSessionId };
      });
      
      // 加载切换后的会话消息
      const { currentSessionId } = get();
      if (currentSessionId) {
        get().setCurrentSession(currentSessionId);
      } else {
        set({ messages: [] });
      }
    } catch (error) {
      console.error('删除会话失败:', error);
    }
  },

  // --- 消息相关动作 ---

  // 添加一条完整的消息 (用户提问，或者 AI 的初始空占位符)
  addMessage: (message) => set((state) => ({ 
    messages: [...state.messages, message] 
  })),

  // 向当前聊天列表的最后一条消息持续追加文字
  updateLastMessage: (contentChunk) => set((state) => {
    const newMessages = [...state.messages];
    if (newMessages.length > 0) {
      const lastIndex = newMessages.length - 1;
      newMessages[lastIndex] = {
        ...newMessages[lastIndex],
        content: newMessages[lastIndex].content + contentChunk
      };
    }
    return { messages: newMessages };
  }),

  // 清空聊天记录
  clearMessages: () => set({ messages: [] })
}));