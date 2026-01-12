FROM node:18-alpine AS builder

WORKDIR /app

# 安裝 Python 和建置工具（bcrypt 需要）
RUN apk add --no-cache python3 make g++

# 複製 package 文件
COPY package*.json ./

# 安裝所有依賴
RUN npm ci

# 複製源代碼
COPY . .

# 建置前端和後端
RUN npm run build

# 生產階段
FROM node:18-alpine

WORKDIR /app

# 安裝 Python（bcrypt 需要）
RUN apk add --no-cache python3 make g++

# 複製 package 文件
COPY package*.json ./

# 只安裝生產依賴
RUN npm ci --only=production

# 從建置階段複製編譯後的文件
COPY --from=builder /app/dist ./dist

# 複製其他必要文件
COPY theme.json ./

# 設定環境變數
ENV NODE_ENV=production
ENV PORT=5000

# 暴露端口
EXPOSE 5000

# 健康檢查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/songs || exit 1

# 啟動應用
CMD ["node", "dist/index.js"]
