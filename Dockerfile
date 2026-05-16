# === 第一阶段：编译打包 ===
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# 执行打包命令，把前端代码编译成 dist 文件夹
RUN npm run build:prod

# === 第二阶段：使用 Nginx 托管静态文件 ===
FROM nginx:alpine
# 将第一阶段打包好的 dist 目录，复制到 Nginx 的默认网页目录下
COPY --from=builder /app/dist /usr/share/nginx/html
# 暴露 80 端口（容器内部）
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]