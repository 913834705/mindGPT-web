// src/pages/Chat.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store';
import { Send, Bot, User, Sparkles, Paperclip, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
const Chat: React.FC = () => {
  const { messages, addMessage, updateLastMessage, currentSessionId, createSession } = useAppStore();
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false); // 控制发送按钮状态
  const scrollRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部 (平滑滚动)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  // 核心：处理发送逻辑与流式接收
  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userText = inputValue.trim();
    setInputValue(''); // 立即清空输入框
    setIsLoading(true);

    let activeSessionId = currentSessionId;

    // 0. 惰性创建：如果当前没有会话（点击了+号），则在此刻真正发送请求去创建它
    if (!activeSessionId) {
      // 截取用户消息的前15个字作为会话标题
      const newTitle = userText.slice(0, 15) || '新对话';
      activeSessionId = await createSession(newTitle);
      
      // 如果创建失败，停止发送
      if (!activeSessionId) {
        setIsLoading(false);
        alert("创建会话失败，请重试");
        return;
      }
    }

    // 1. 把用户的问题立刻显示在界面上
    addMessage({ id: Date.now(), role: 'user', content: userText });

    // 2. 先给 AI 创建一个空的“气泡”占位，用来一会挨个字填进去
    const aiMessageId = Date.now() + 1;
    addMessage({ id: aiMessageId, role: 'ai', content: '' });

    try {
      // 注意：流式请求推荐使用原生 fetch，而非你封装的 axios
      const response = await fetch('/api/chat', { // 请确保端口号与你后端一致
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` // 附带身份凭证
        },
        body: JSON.stringify({ 
          message: userText,
          sessionId: activeSessionId // [新增] 把刚刚创建或已有的 sessionId 传给后端
        })
      });

      if (!response.ok || !response.body) {
        throw new Error('网络请求失败');
      }
      
      // 3. 开启流式读取大门
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      // 4. 持续读取数据流，直到后端发送 [DONE] 或断开连接
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // 解码二进制流为文本字符串
        const chunkStr = decoder.decode(value, { stream: true });
        
        // SSE 格式中，数据通过 \n 换行符分割
        const lines = chunkStr.split('\n');
        
        for (const line of lines) {
          if (line.trim().startsWith('data:')) {
            const dataStr = line.replace('data:', '').trim();
            
            if (dataStr === '[DONE]') return; // 流传输结束
            
            try {
              // 解析后端的 JSON： {"text":"你"}
              const parsed = JSON.parse(dataStr);
              if (parsed.text) {
                // 将解出来的单字，追加到 Zustand store 的最后一条消息中
                updateLastMessage(parsed.text);
              }
            } catch (e) {
              // 忽略解析错误 (有时候 chunk 截断会导致一半的 JSON，继续等下一个即可)
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat 流式读取失败:', error);
      updateLastMessage('\n\n**[网络连接异常，请重试]**');
    } finally {
      setIsLoading(false); // 无论成功失败，恢复发送按钮
    }
  };

  // 支持键盘快捷键：回车发送，Shift+回车换行
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // 阻止默认的回车换行行为
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* 顶部状态栏 */}
      <header className="h-16 flex items-center justify-between px-8 border-b border-white/5 bg-[#0d0d12]/50 backdrop-blur-md z-10">
        <div className="flex items-center">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-3 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
          <h2 className="text-sm font-semibold tracking-wide text-gray-200">
            {isLoading ? 'AI 正在思考...' : 'AI 助手已就绪'}
          </h2>
        </div>
        <div className="flex items-center space-x-2 text-[10px] text-gray-500 bg-white/5 px-3 py-1 rounded-full border border-white/5">
          <Sparkles size={12} className="text-purple-400" />
          <span>DeepSeek Powered</span>
        </div>
      </header>

      {/* 聊天记录区 */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth"
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 bg-purple-600/10 rounded-2xl flex items-center justify-center border border-purple-500/20">
              <Bot className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">有什么我可以帮您的？</h3>
              <p className="text-sm text-gray-500 mt-1">您可以尝试询问关于已上传知识库的内容。</p>
            </div>
          </div>
        )}

        {messages.map((msg:any) => (
          <div key={msg.id} className={`flex gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {/* 头像 */}
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${
              msg.role === 'user' 
                ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white' 
                : 'bg-[#1a1a24] border border-white/10 text-purple-400'
            }`}>
              {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
            </div>
            
            {/* 消息气泡 */}
            <div className={`max-w-[80%] group relative`}>
              <div className={`px-5 py-3.5 rounded-2xl text-[14px] leading-relaxed shadow-xl border ${
                msg.role === 'user' 
                  ? 'bg-purple-600 text-white border-purple-500 shadow-purple-500/10' 
                  : 'bg-[#1a1a24]/80 backdrop-blur-sm text-gray-300 border-white/5 shadow-black/20'
              }`}>
                {/* 如果是 AI 消息且内容为空，显示思考动画 */}
                {msg.role === 'ai' && msg.content === '' ? (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                  </span>
                ) : (
                  // [核心新增] 使用 ReactMarkdown 替换原来的 msg.content
                  // 如果是用户自己发的消息，为了简洁，一般不需要 Markdown 解析，直接展示即可；如果是 AI 发的，进行完全解析
                  msg.role === 'user' ? (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  ) : (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]} // 支持表格、删除线等扩展语法
                      components={{
                        // 自定义各类 Markdown 标签的样式，完美融入你的 Tailwind 主题
                        p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                        a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline" />,
                        ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1 marker:text-purple-500">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1 marker:text-purple-500">{children}</ol>,
                        li: ({ children }) => <li>{children}</li>,
                        h1: ({ children }) => <h1 className="text-xl font-bold text-white mb-3 mt-4">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-lg font-bold text-white mb-3 mt-4">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-base font-bold text-white mb-2 mt-3">{children}</h3>,
                        strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
                        blockquote: ({ children }) => <blockquote className="border-l-4 border-purple-500 pl-4 py-1 my-3 bg-white/5 rounded-r-lg text-gray-400 italic">{children}</blockquote>,
                        table: ({ children }) => <div className="overflow-x-auto mb-3"><table className="min-w-full border-collapse border border-white/10">{children}</table></div>,
                        th: ({ children }) => <th className="border border-white/10 px-4 py-2 bg-white/5 font-semibold text-white">{children}</th>,
                        td: ({ children }) => <td className="border border-white/10 px-4 py-2">{children}</td>,
                        code({ node, inline, className, children, ...props }: any) {
                          const match = /language-(\w+)/.exec(className || '');
                          return !inline && match ? (
                            // 代码块高亮渲染
                            <div className="my-4 rounded-xl overflow-hidden border border-white/10 bg-[#1e1e1e] shadow-lg">
                              <div className="flex items-center px-4 py-2 bg-[#2d2d2d] border-b border-white/5 text-xs text-gray-400 font-mono">
                                {match[1]}
                              </div>
                              <SyntaxHighlighter
                                {...props}
                                style={vscDarkPlus as any}
                                language={match[1]}
                                PreTag="div"
                                customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            </div>
                          ) : (
                            // 行内代码块渲染
                            <code {...props} className="bg-black/30 text-purple-300 px-1.5 py-0.5 rounded-md text-sm font-mono border border-white/5">
                              {children}
                            </code>
                          );
                        }
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  )
                )}
              </div>
            </div>
          </div>
        ))}
        {/* 占位，防止底部被遮挡 */}
        <div className="h-24 shrink-0" />
      </div>

      {/* 底部输入区 - 悬浮胶囊设计 */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-3xl px-4">
        <div className="bg-[#1a1a24]/80 backdrop-blur-2xl border border-white/10 p-2 rounded-2xl shadow-2xl focus-within:border-purple-500/50 transition-all duration-300">
          <div className="flex items-end gap-2">
            <button className="p-3 text-gray-500 hover:text-purple-400 transition-colors">
              <Paperclip size={20} />
            </button>
            <textarea 
              rows={1}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 max-h-48 py-3 bg-transparent outline-none resize-none text-sm text-gray-200 placeholder-gray-600"
              placeholder={isLoading ? "AI 正在回复中..." : "输入消息，Enter 发送，Shift + Enter 换行..."}
            />
            <button 
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className="p-3 bg-purple-600 text-white rounded-xl hover:bg-purple-500 disabled:opacity-30 disabled:hover:bg-purple-600 transition-all shadow-lg shadow-purple-900/20"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
        </div>
        <p className="text-center text-[10px] text-gray-600 mt-3 tracking-widest uppercase">
          Powered by MindGPT Intelligent Engine
        </p>
      </div>
    </div>
  );
};

export default Chat;