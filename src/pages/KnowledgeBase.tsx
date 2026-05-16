// src/pages/KnowledgeBase.tsx
import React, { useState, useRef,useEffect } from 'react';
import { 
  UploadCloud, 
  Search, 
  FileText, 
  Trash2, 
  CheckCircle2, 
  Loader2, 
  MoreVertical,
  Database,
  AlertCircle // [新增] 引入失败图标
} from 'lucide-react';
import request from '../utils/request';
// 定义文档的数据结构
interface DocumentItem {
  id: string | number;
  title: string;       // 对应后端的 title
  size: string;        // 对应后端的 size
  createdAt: string;   // 对应后端的 createdAt
  status: 'ready' | 'processing' | 'failed'| 'uploading'; // 对应后端的 status
}



const KnowledgeBase: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  // 存储每个文件的上传进度
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // [新增] 页面加载时，获取真实文档列表
  useEffect(() => {
    fetchDocuments();
    // 创建一个持久的 Fetch 连接，连向后端的 status-stream
    const abortController = new AbortController();
    
    const listenToStatus = async () => {
      try {
        const response = await fetch('/api/documents/status-stream', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          signal: abortController.signal // 用于在组件卸载时强制掐断网络
        });

        const reader = response.body?.getReader();
        const decoder = new TextDecoder('utf-8');
        console.log();
        
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunkStr = decoder.decode(value, { stream: true });
            const lines = chunkStr.split('\n');
            
            for (const line of lines) {
              if (line.trim().startsWith('data:')) {
                const dataStr = line.replace('data:', '').trim();
                try {
                  const payload = JSON.parse(dataStr);
                  // [核心] 收到后端推来的特定文档更新消息，局部更新 React 状态！
                  setDocuments(prevDocs => 
                    prevDocs.map(doc => 
                      doc.id === payload.documentId 
                        ? { ...doc, status: payload.status } // 把处理中变成已就绪
                        : doc
                    )
                  );
                } catch (e) {}
              }
            }
          }
        }
      } catch (error:any) {
        if (error.name !== 'AbortError') {
          console.error('SSE 状态监听中断', error);
        }
      }
    };

    listenToStatus();

    // 组件卸载（离开知识库页面）时，主动断开网络请求
    return () => {
      abortController.abort();
    };
  }, []);

  // [新增] 获取文档列表接口
  const fetchDocuments = async () => {
    try {
      // 调用后端的 /documents/list 接口
      const data: any = await request.get('/documents/list');
      setDocuments(data);
    } catch (error: any) {
      console.error('获取文档列表失败:', error.message);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFileUpload(files[0]);
  };

// [核心修改] 真实的真实文件上传逻辑
  const handleFileUpload = async (file: File) => {
    // 1. 构造 FormData，这和后端 @UseInterceptors(FileInterceptor('file')) 对应
    const formData = new FormData();
    formData.append('file', file);
    
    // 生成一个纯前端的临时 ID
    const tempId = 'temp_' + Date.now();

    // 估算大小用于界面展示
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    const sizeStr = sizeInMB !== '0.00' ? `${sizeInMB} MB` : `${(file.size / 1024).toFixed(2)} KB`;

    //  马上在界面顶部插入一条“正在上传”的假数据
    const tempDoc: DocumentItem = {
      id: tempId,
      title: file.name,
      size: sizeStr,
      createdAt: new Date().toISOString(),
      status: 'uploading' // 设置为前端专属的上传状态
    };
    // 把新文件插到列表最前面
    setDocuments(prev => [tempDoc, ...prev]);
    // 初始化该文件的进度为 0
    setUploadProgress(prev => ({ ...prev, [tempId]: 0 }));

    try {

      // 3. 调用后端上传接口
        const realDoc: any =await request.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data' // 上传文件必须配置此 Header
        },
        onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          
          // 更新进度条状态
          setUploadProgress(prev => ({
            ...prev,
            [tempId]: percentCompleted
          }));
        }
      }
      });

      // [新增] 3. 接口调用成功 (到达服务器)，用真实的文档数据替换掉我们的临时假数据！
      setDocuments(prevDocs => 
        prevDocs.map(doc => doc.id === tempId ? realDoc : doc)
      );

      // 上传完毕（到达服务器），进度条归零/移除
    setUploadProgress(prev => {
      const newState = { ...prev };
      delete newState[tempId];
      return newState;
    });

      
    } catch (error: any) {
      alert('文件上传失败: ' + error.message);
      // 5. 如果上传失败，把刚才那条临时假数据和进度记录直接删掉
      setDocuments(prev => prev.filter(doc => doc.id !== tempId));
      setUploadProgress(prev => {
        const newState = { ...prev };
        delete newState[tempId];
        return newState;
      });
    
    }
  };

  // [新增] 删除文档接口逻辑 (顺手帮你把删除也写了)
  const handleDelete = async (id: string | number) => {
    if (!window.confirm('确定要删除这份文档吗？')) return;
    
    try {
      await request.delete(`/documents/delete/${id}`);
      // 删除成功后，更新本地状态，从列表中移除该项
      setDocuments(prev => prev.filter(doc => doc.id !== id));
    } catch (error: any) {
      alert('删除失败: ' + error.message);
    }
  };
  // 格式化时间的辅助函数
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.getHours() + ':' + String(date.getMinutes()).padStart(2, '0');
  };


  return (
    <div className="h-full flex flex-col p-8 overflow-y-auto relative">
      {/* 页面标题区 */}
      <div className="mb-8 relative z-10">
        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center">
          <Database className="w-8 h-8 mr-3 text-purple-500" />
          知识库管理
        </h1>
        <p className="text-sm text-gray-400 mt-2">
          上传您的专属文档，MindGPT 将自动解析并构建专属知识网络。
        </p>
      </div>

      {/* 顶部操作区：搜索与拖拽上传 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 relative z-10">
        
        {/* 上传区域 */}
        <div 
          className={`lg:col-span-2 relative flex flex-col items-center justify-center p-8 rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer ${
            isDragging 
              ? 'border-purple-500 bg-purple-500/10 scale-[1.02] shadow-[0_0_30px_rgba(168,85,247,0.2)]' 
              : 'border-white/10 bg-[#1a1a24]/50 hover:border-purple-500/50 hover:bg-[#1a1a24]/80'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={(e) => {
              // 确保用户选择了文件后再调用上传
              if (e.target.files && e.target.files.length > 0) {
                handleFileUpload(e.target.files[0]);
                // 清空 input 值，允许用户连续上传同一个文件
                e.target.value = ''; 
              }
            }}
            accept=".pdf,.doc,.docx,.txt,.csv"
          />
          <div className="w-16 h-16 mb-4 rounded-full bg-purple-600/20 flex items-center justify-center">
            <UploadCloud className="w-8 h-8 text-purple-400" />
          </div>
          <h3 className="text-lg font-medium text-white mb-1">点击或拖拽文件到此处上传</h3>
          <p className="text-sm text-gray-500">支持 PDF, DOCX, TXT, CSV 格式，单个文件不超过 50MB</p>
        </div>

        {/* 数据统计与搜索 */}
        <div className="flex flex-col space-y-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input 
              type="text" 
              placeholder="搜索文档名称..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1a1a24]/80 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all shadow-lg"
            />
          </div>

          <div className="flex-1 bg-gradient-to-br from-purple-900/40 to-[#1a1a24]/80 border border-purple-500/20 rounded-2xl p-6 flex flex-col justify-center backdrop-blur-md">
            <h4 className="text-sm font-medium text-purple-300 mb-2">已索引文档总数</h4>
            <div className="text-4xl font-black text-white">{documents.length}</div>
            <div className="w-full bg-white/5 h-1.5 rounded-full mt-4 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-indigo-500 w-2/3 h-full rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* 文档列表区 */}
      <div className="relative z-10">
        <h3 className="text-lg font-medium text-white mb-4">全部文档</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {documents
            .filter(doc => doc.title.toLowerCase().includes(searchQuery.toLowerCase()))
            .map((doc) => (
            <div 
              key={doc.id}
              className="group bg-[#1a1a24]/60 backdrop-blur-sm border border-white/5 rounded-2xl p-5 hover:bg-[#1a1a24] hover:border-purple-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/5 rounded-full blur-2xl group-hover:bg-purple-600/10 transition-colors pointer-events-none" />
              
              <div className="flex items-start justify-between relative z-10">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-white/5 rounded-xl text-purple-400 group-hover:text-purple-300 transition-colors">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-200 line-clamp-1 group-hover:text-white transition-colors" title={doc.title}>
                      {doc.title}
                    </h4>
                    <div className="flex items-center space-x-3 mt-2 text-xs text-gray-500">
                      <span>{doc.size}</span>
                      <span>•</span>
                      <span>{formatDate(doc.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => handleDelete(doc.id)}
                  // [修改] 如果处于 uploading 状态，禁止用户点击删除按钮
                  disabled={doc.status === 'uploading'}
                  className="text-gray-500 hover:text-red-400 transition-colors p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-5 flex items-center justify-between pt-4 border-t border-white/5 relative z-10 min-h-[44px]" >
                {doc.status === 'uploading' ? (
                  /* 1. 正在上传到服务器：展示进度条 */
                  <div className="w-full">
                    <div className="flex items-center justify-between text-xs text-purple-400 mb-2 font-medium">
                      <span className="flex items-center"><UploadCloud className="w-3.5 h-3.5 mr-1.5 animate-pulse" /> 上传文件中...</span>
                      <span>{uploadProgress[doc.id] || 0}%</span>
                    </div>
                    <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${uploadProgress[doc.id] || 0}%` }}
                      />
                    </div>
                  </div>
                ) : doc.status === 'processing' ?(
                  /* 2. 正在向量化：展示转圈动画 */
                  <div className="flex items-center text-xs text-blue-400/90 font-medium">
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    AI 向量解析中...
                  </div>
                ):doc.status === 'failed' ? (
                  /* 3. 解析失败：展示报错提示 */
                  <div className="flex items-center text-xs text-red-400/90 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
                    文档解析失败
                  </div>
                ): (
                  /* 4. 处理完毕：展示已就绪对勾 */
                  <div className="flex items-center text-xs text-green-400/90 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    已就绪
                  </div>
                )}
                
                {/* 仅在非上传状态才显示右侧的三个点菜单 */}
                {doc.status !== 'uploading' && (
                  <button className="text-gray-500 hover:text-white">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {documents.length === 0 && (
          <div className="w-full py-20 flex flex-col items-center justify-center text-gray-500 border border-dashed border-white/10 rounded-3xl mt-4">
            <FileText className="w-12 h-12 mb-3 opacity-20" />
            <p>暂无文档，请先在上方上传</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default KnowledgeBase;