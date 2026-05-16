import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // 设置开发服务器的端口（可选）
    port: 5173,
    // 配置跨域代理
    proxy: {
      // 拦截所有以 '/api' 开头的请求
      '/api': {
        target: 'http://localhost:3000', // 你的 NestJS 后端运行地址
        changeOrigin: true,              // 开启跨域：将请求头中的 host 修改为 target
        
        // 【注意】：这取决于你的 NestJS 后端路由配置！
        // 场景 1：如果你的 NestJS 配置了全局前缀 app.setGlobalPrefix('api')，则不需要下面这行。
        // 场景 2：如果你的 NestJS 路由仅仅是 @Controller('auth')，你需要把 '/api' 抹掉，请取消下面这行的注释。
         rewrite: (path) => path.replace(/^\/api/, ''), 
      },
    },
  },
})
