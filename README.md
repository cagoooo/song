# 🎸 互動式吉他彈唱社交點播平台

一個支援即時點播、投票和社交音樂分享的互動式吉他表演社群平台。

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat&logo=firebase&logoColor=black)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)

---

## 📋 目錄

- [功能特色](#-功能特色)
- [技術架構](#-技術架構)
- [系統需求](#-系統需求)
- [安裝與設定](#-安裝與設定)
- [環境變數設定](#-環境變數設定)
- [開發指南](#-開發指南)
- [API 文件](#-api-文件)
- [部署指南](#-部署指南)
- [專案結構](#-專案結構)
- [授權條款](#-授權條款)

---

## ✨ 功能特色

### 🎵 歌曲點播系統
- 即時 WebSocket 更新點播狀態
- 支援歌曲搜尋與篩選
- 分頁載入優化效能

### 🏆 即時排行榜
- 按點播次數排名
- 獎牌動畫效果（🥇🥈🥉）
- 煙火慶祝特效

### 👤 管理員後台
- 歌曲新增/編輯/刪除
- 批次匯入歌曲功能
- 歌曲建議審核管理
- 統計數據儀表板

### 🏷️ 標籤分類系統
- 自訂標籤管理
- 多標籤分類
- 標籤篩選功能

### 📱 社群分享
- QR Code 分享功能
- 社群媒體分享按鈕
- 掃描統計追蹤

### 🎨 使用者體驗
- 響應式設計（RWD）
- 豐富動畫效果（Framer Motion）
- 骨架屏載入效果
- 深色主題配色

---

## 🏗️ 技術架構

### 前端 (Client)
| 技術 | 說明 |
|------|------|
| **React 18** | UI 框架 |
| **TypeScript** | 類型安全 |
| **TailwindCSS** | 樣式框架 |
| **Wouter** | 輕量路由 |
| **TanStack Query** | 伺服器狀態管理 |
| **Framer Motion** | 動畫效果 |
| **Shadcn/ui** | UI 元件庫 |
| **Radix UI** | 無障礙元件 |
| **Recharts** | 數據視覺化 |

### 後端 (Server)
| 技術 | 說明 |
|------|------|
| **Node.js** | 執行環境 |
| **Express.js** | Web 框架 |
| **WebSocket (ws)** | 即時通訊 |
| **Passport.js** | 身份驗證 |
| **bcrypt** | 密碼加密 |

### 資料庫
| 技術 | 說明 |
|------|------|
| **Firebase Firestore** | 主要資料庫 |
| **Drizzle ORM** | PostgreSQL ORM（備用） |

### 開發工具
| 技術 | 說明 |
|------|------|
| **Vite** | 建置工具 |
| **esbuild** | 後端打包 |
| **tsx** | TypeScript 執行器 |
| **Drizzle Kit** | 資料庫遷移 |

---

## 💻 系統需求

- **Node.js**: 18.x 或更高版本
- **npm**: 9.x 或更高版本
- **Firebase 專案**: 需要有效的 Firebase 專案

---

## 🚀 安裝與設定

### 1. 複製專案

```bash
git clone https://github.com/YOUR_USERNAME/guitar-social-platform.git
cd guitar-social-platform
```

### 2. 安裝依賴

```bash
npm install
```

### 3. 設定環境變數

複製環境變數範本並填入您的設定：

```bash
cp .env.example .env
```

### 4. 啟動開發伺服器

```bash
npm run dev
```

開發伺服器將在 `http://localhost:5000` 啟動。

---

## 🔐 環境變數設定

在專案根目錄建立 `.env` 檔案，設定以下環境變數：

```env
# Firebase 設定（必要）
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
FIREBASE_APP_ID=your_firebase_app_id

# PostgreSQL 設定（選用，使用 Drizzle ORM 時需要）
DATABASE_URL=postgresql://user:password@host:5432/database

# Session 設定
REPL_ID=your_session_secret
```

### 取得 Firebase 設定

1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 選擇或建立專案
3. 點擊「專案設定」→「一般」
4. 在「您的應用程式」區塊取得設定值

---

## 🛠️ 開發指南

### 可用指令

| 指令 | 說明 |
|------|------|
| `npm run dev` | 啟動開發伺服器（含 HMR） |
| `npm run build` | 建置生產版本 |
| `npm start` | 執行生產版本 |
| `npm run check` | TypeScript 類型檢查 |
| `npm run db:push` | 推送資料庫結構（Drizzle） |

### 開發流程

1. **前端開發**：修改 `client/src/` 下的檔案
2. **後端開發**：修改 `server/` 下的檔案
3. **資料庫調整**：修改 `db/schema.ts`

### 程式碼結構說明

```
client/src/
├── components/     # React 元件
│   ├── ui/        # 基礎 UI 元件（Shadcn）
│   ├── SongList.tsx        # 歌曲列表
│   ├── RankingBoard.tsx    # 排行榜
│   ├── SongSuggestion.tsx  # 歌曲建議
│   └── ...
├── pages/         # 頁面元件
├── hooks/         # 自訂 Hooks
├── lib/           # 工具函式
└── App.tsx        # 應用程式入口
```

---

## 📡 API 文件

### 認證 API

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/register` | 註冊新用戶 |
| POST | `/api/login` | 用戶登入 |
| POST | `/api/logout` | 用戶登出 |
| GET | `/api/user` | 取得當前用戶資訊 |

### 歌曲 API

| 方法 | 路徑 | 說明 | 權限 |
|------|------|------|------|
| GET | `/api/songs` | 取得歌曲列表（支援分頁、搜尋） | 公開 |
| GET | `/api/songs/top` | 取得排行榜前 N 名 | 公開 |
| POST | `/api/songs` | 新增歌曲 | 管理員 |
| PATCH | `/api/songs/:id` | 更新歌曲 | 管理員 |
| DELETE | `/api/songs/:id` | 刪除歌曲 | 管理員 |
| POST | `/api/songs/batch` | 批次匯入歌曲 | 管理員 |
| POST | `/api/songs/reset-votes` | 重置所有投票 | 管理員 |

### 標籤 API

| 方法 | 路徑 | 說明 | 權限 |
|------|------|------|------|
| GET | `/api/tags` | 取得所有標籤 | 公開 |
| POST | `/api/tags` | 新增標籤 | 管理員 |
| DELETE | `/api/tags/:id` | 刪除標籤 | 管理員 |
| GET | `/api/songs/:songId/tags` | 取得歌曲的標籤 | 公開 |
| POST | `/api/songs/:songId/tags` | 為歌曲新增標籤 | 管理員 |
| DELETE | `/api/songs/:songId/tags/:tagId` | 移除歌曲標籤 | 管理員 |

### 歌曲建議 API

| 方法 | 路徑 | 說明 | 權限 |
|------|------|------|------|
| GET | `/api/suggestions` | 取得歌曲建議列表 | 公開 |
| POST | `/api/suggestions` | 提交歌曲建議 | 公開 |
| PATCH | `/api/suggestions/:id/status` | 更新建議狀態 | 管理員 |
| DELETE | `/api/suggestions/:id` | 刪除建議 | 管理員 |

### QR Code 統計 API

| 方法 | 路徑 | 說明 | 權限 |
|------|------|------|------|
| POST | `/api/qr-scans` | 記錄 QR Code 掃描 | 公開 |
| GET | `/api/qr-scans/stats` | 取得掃描統計 | 管理員 |

### WebSocket 事件

連接路徑：`ws://your-domain/ws`

| 事件類型 | 方向 | 說明 |
|----------|------|------|
| `SONGS_UPDATE` | Server → Client | 歌曲列表更新 |
| `SUGGESTIONS_UPDATE` | Server → Client | 建議列表更新 |
| `VOTE` | Client → Server | 投票給歌曲 |
| `ERROR` | Server → Client | 錯誤訊息 |

---

## 🌐 部署指南

### 方式一：部署至 Vercel（推薦）

> ⚠️ **注意**：此專案使用 WebSocket，Vercel 的 Serverless Functions 對 WebSocket 支援有限，建議使用 Vercel + 外部 WebSocket 服務（如 Pusher）的組合，或改用其他平台。

#### 步驟

1. 安裝 Vercel CLI
   ```bash
   npm i -g vercel
   ```

2. 登入 Vercel
   ```bash
   vercel login
   ```

3. 部署
   ```bash
   vercel --prod
   ```

4. 設定環境變數
   - 在 Vercel Dashboard 設定 Firebase 相關環境變數

### 方式二：部署至 Railway

Railway 完整支援 Node.js 應用程式和 WebSocket。

#### 步驟

1. 前往 [Railway](https://railway.app/) 建立帳號
2. 從 GitHub 匯入專案
3. 設定環境變數
4. 部署會自動執行 `npm run build` 和 `npm start`

### 方式三：部署至 Render

1. 前往 [Render](https://render.com/) 建立 Web Service
2. 連接 GitHub 儲存庫
3. 設定：
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. 加入環境變數

### 方式四：Docker 部署

建立 `Dockerfile`：

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 5000
CMD ["npm", "start"]
```

建置並執行：

```bash
docker build -t guitar-platform .
docker run -p 5000:5000 --env-file .env guitar-platform
```

---

## 📁 專案結構

```
song/
├── client/                 # 前端應用程式
│   ├── index.html         # HTML 入口
│   ├── public/            # 靜態資源
│   └── src/
│       ├── components/    # React 元件
│       ├── hooks/         # 自訂 Hooks
│       ├── lib/           # 工具函式
│       ├── pages/         # 頁面元件
│       ├── App.tsx        # 應用程式入口
│       ├── main.tsx       # React 入口
│       └── index.css      # 全域樣式
├── server/                 # 後端伺服器
│   ├── index.ts           # 伺服器入口
│   ├── routes.ts          # API 路由
│   ├── auth.ts            # 認證邏輯
│   └── vite.ts            # Vite 開發伺服器
├── db/                     # 資料庫
│   ├── firebase.ts        # Firebase 設定
│   ├── schema.ts          # Drizzle 資料庫結構
│   └── index.ts           # 資料庫入口
├── package.json           # 專案設定
├── tsconfig.json          # TypeScript 設定
├── vite.config.ts         # Vite 設定
├── tailwind.config.ts     # TailwindCSS 設定
├── drizzle.config.ts      # Drizzle 設定
└── theme.json             # 主題設定
```

---

## 🔑 預設管理員帳號

首次啟動時，系統會自動建立預設管理員帳號：

| 帳號 | 密碼 | 權限 |
|------|------|------|
| `cagoo` | （請查看 `db/firebase.ts`） | 管理員 |

> ⚠️ **安全提醒**：上線後請立即更改預設密碼！

---

## 🔧 疑難排解

### 常見問題

1. **Firebase 連線失敗**
   - 確認環境變數設定正確
   - 確認 Firebase 專案已啟用 Firestore

2. **WebSocket 連線中斷**
   - 檢查防火牆設定
   - 確認伺服器支援 WebSocket

3. **建置失敗**
   - 執行 `npm run check` 檢查類型錯誤
   - 確認 Node.js 版本為 18.x 以上

---

## 📄 授權條款

本專案採用 MIT 授權條款。詳見 [LICENSE](LICENSE) 檔案。

---

## 🙏 致謝

- [Shadcn/ui](https://ui.shadcn.com/) - 優美的 UI 元件
- [Radix UI](https://www.radix-ui.com/) - 無障礙元件
- [Framer Motion](https://www.framer.com/motion/) - 動畫庫
- [TanStack Query](https://tanstack.com/query) - 資料同步

---

*文件最後更新：2026 年 1 月 12 日*
