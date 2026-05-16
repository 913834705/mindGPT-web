# 1. 使用官方的 Node.js 作为基础镜像
FROM node:20-alpine

# 2. 设置容器内的默认工作目录
WORKDIR /app

# 3. 复制依赖文件到容器中
COPY package*.json ./

# 4. 安装项目依赖
RUN npm install

# 5. 复制项目的所有源代码到容器中
COPY . .

# 6. 如果是 NestJS/TypeScript 项目，执行打包编译命令（如果是纯 JS 可以省略）
RUN npm run dev

# 7. 暴露项目在容器内运行的端口（假设你的代码里监听的是 3000）
EXPOSE 3000

# 8. 容器启动时执行的最终命令
CMD ["npm", "run", "dev"]
