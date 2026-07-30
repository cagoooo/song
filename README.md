# 🎸 互動式吉他彈唱社交點播平台

一個支援即時點播、投票和社交音樂分享的互動式吉他表演社群平台。

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat&logo=firebase&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-B73BFE?style=flat&logo=vite&logoColor=FFD62E)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)

## ✨ 特色功能

### 🎵 即時點播系統
- 觀眾可自由表達音樂喜好
- Firestore 即時同步，即刻反映投票結果
- 動態排行榜顯示熱門歌曲

### 📊 互動排行榜
- 即時更新的點播排行
- 精美的排名變化動畫
- 煙火慶祝特效

### 👤 管理員後台
- 歌曲新增/編輯/刪除
- 批次匯入歌曲功能
- 歌曲建議審核管理

### 🏷️ 標籤分類系統
- 自訂標籤管理
- 多標籤分類
- 標籤篩選功能

### 📱 社群分享
- QR Code 分享功能
- 社群媒體分享按鈕

### 🎨 使用者體驗
- 響應式設計（RWD）
- 豐富動畫效果（Framer Motion）
- 骨架屏載入效果

---

## 🏗️ 技術架構

### v2.0 純前端架構

本專案採用 **純前端架構**，直接與 Firebase 服務溝通，無需後端伺服器：

```
┌─────────────────────────────────────────────────────┐
│                    前端 (React + Vite)               │
│  ┌─────────────┬─────────────┬─────────────────────┐ │
│  │  SongList   │  Ranking    │  SongSuggestion    │ │
│  │  SongImport │  Board      │  LoginForm         │ │
│  └─────────────┴─────────────┴─────────────────────┘ │
│                         │                            │
│  ┌─────────────────────────────────────────────────┐ │
│  │           Firebase SDK (Direct Access)          │ │
│  │  ┌──────────────┐  ┌──────────────────────────┐ │ │
│  │  │  Firestore   │  │  Firebase Authentication │ │ │
│  │  │  (onSnapshot)│  │  (Email/Password)        │ │ │
│  │  └──────────────┘  └──────────────────────────┘ │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│               Firebase Cloud Services                │
│  ┌──────────────┐  ┌──────────────────────────────┐ │
│  │  Firestore   │  │  Authentication              │ │
│  │  Database    │  │  Service                     │ │
│  └──────────────┘  └──────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### 核心技術

| 類別 | 技術 |
|------|------|
| **前端框架** | React 18 + TypeScript |
| **建置工具** | Vite 5 |
| **樣式** | TailwindCSS + Shadcn/ui |
| **狀態管理** | TanStack Query |
| **動畫** | Framer Motion |
| **認證** | Firebase Authentication |
| **資料庫** | Cloud Firestore (即時同步) |
| **部署** | GitHub Pages |

---

## 📋 系統需求

- **Node.js**: 18.x 或更高版本
- **npm**: 9.x 或更高版本
- **Firebase 專案**: 需要有效的 Firebase 專案

---

## 🚀 快速開始

### 1. 複製專案

```bash
git clone https://github.com/cagoooo/song.git
cd song
```

### 2. 安裝依賴

```bash
npm install
```

### 3. 設定環境變數

複製環境變數範本並填入您的 Firebase 設定：

```bash
cp .env.example .env
```

編輯 `.env` 檔案：

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 4. 啟動開發伺服器

```bash
npm run dev
```

開啟瀏覽器訪問 `http://localhost:5173/song/`

---

## 🌐 部署至 GitHub Pages

### 步驟 1：設定 GitHub Secrets

前往 **Repository Settings → Secrets → Actions**，新增以下環境變數：

| 名稱 | 說明 |
|------|------|
| `VITE_FIREBASE_API_KEY` | Firebase API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase App ID |

### 步驟 2：啟用 GitHub Pages

1. 前往 **Repository Settings → Pages**
2. **Source** 選擇 **GitHub Actions**

### 步驟 3：部署

推送至 `main` 分支即會自動觸發部署。

---

## 🔐 Firebase 安全規則

專案已包含 `firestore.rules` 檔案，使用以下命令部署：

```bash
firebase deploy --only firestore:rules --project YOUR_PROJECT_ID
```

### 規則說明

| 集合 | 讀取 | 寫入 |
|------|------|------|
| `songs` | ✅ 公開 | 🔒 僅管理員 |
| `votes` | ✅ 公開 | ✅ 任何人可新增 |
| `songSuggestions` | ✅ 公開 | ✅ 任何人可新增 |
| `users` | 🔒 本人/管理員 | 🔒 本人/管理員 |

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
│       ├── lib/           # Firebase 工具函式
│       │   ├── firebase.ts    # Firebase 初始化
│       │   ├── firestore.ts   # Firestore 資料層
│       │   └── auth.ts        # 認證工具
│       └── pages/         # 頁面元件
├── .github/
│   └── workflows/
│       └── deploy.yml     # GitHub Actions 部署
├── firestore.rules        # Firestore 安全規則
├── firebase.json          # Firebase 配置
├── vite.config.ts         # Vite 設定
└── package.json
```

---

## 🛠️ 可用指令

| 指令 | 說明 |
|------|------|
| `npm run dev` | 啟動開發伺服器 |
| `npm run build` | 建置生產版本 |
| `npm run preview` | 預覽生產版本 |
| `npm run check` | TypeScript 類型檢查 |

---

## 🔧 管理員帳號設定

### 建立管理員

1. 在 **Firebase Console → Authentication** 建立 Email/Password 使用者
2. 複製使用者的 **UID**
3. 在 **Firestore → users** 集合建立文件：
   - 文件 ID = 使用者 UID
   - 欄位：`isAdmin: true`

---

## 📜 更新日誌

### v3.7.0 (2026-01-18)
- 🎸 **「正在彈奏中」即時同步**：管理員可標記當前正在演奏的歌曲
- 📢 **訪客即時通知**：歌曲開始彈奏時，訪客會收到浮動通知
- 🔗 **快捷跳轉**：通知中提供一鍵搜尋吉他譜/歌詞按鈕
- ✨ **視覺效果增強**：「正在彈奏中」歌曲卡片顯示醒目的橘色脈動邊框

### v2.9.0 (2026-01-14)
- 🔐 **LoginForm 優化**：輸入框高度 48px、密碼顯示切換、Loading 狀態
- 🦴 **SkeletonCard 元件**：通用骨架屏，支援 song/ranking/suggestion
- 📭 **EmptyState 元件**：空狀態提示，4 種變體和動畫效果

### v2.8.0 (2026-01-14)
- ⬆️ **返回頂部按鈕**：滾動超過 400px 顯示，支援觸覺回饋
- 📳 **觸覺回饋 Hook**：useHapticFeedback 支援多種震動模式
- ♿ **排行榜語義化**：改用 ol/li 結構，新增詳細 aria-label

### v2.7.0 (2026-01-14)
- 🎨 **UI/UX 優化 Phase 1**：
  - SongCard 響應式間距和字體優化
  - SearchBar 新增清除按鈕和模糊搜尋切換
  - RankingBoard 操作按鈕尺寸增加至 44px（觸控友善）
- ♿ **無障礙改善**：新增 aria-label 到投票、吉他譜、歌詞按鈕

### v2.6.0 (2026-01-14)
- 🧪 **useVoting 測試**：新增 11 個投票邏輯測試案例
- 👆 **手勢滑動**：手機版 Tab 支援左右滑動切換（react-swipeable）
- 🔍 **模糊搜尋**：整合 Fuse.js 支援容錯搜尋歌曲

### v2.5.0 (2026-01-14)
- 📱 **響應式 UI 優化**：手機版新增 Tab 切換介面（歌曲/排行榜）
- 🛡️ **Firestore 安全強化**：新增投票資料驗證、歌曲建議內容長度限制

### v2.4.0 (2026-01-14)
- 🧪 **單元測試基礎建設**：整合 Vitest 測試框架，建立 `useSongSearch` 和 `error-handler` 測試
- 📦 **程式碼分割**：使用 React.lazy 延遲載入 RankingBoard 和 SongSuggestion 減少初始 Bundle

### v2.3.0 (2026-01-14)
- 🔍 **搜尋功能強化**：關鍵字搜尋現在可搜尋所有曲庫內容，不再限制於前 30 首

### v2.0.0 (2026-01-12)
- 🔄 **架構重構**：從 Express + WebSocket 轉換為純前端架構
- 🔥 **Firebase 整合**：直接使用 Firebase SDK，無需後端伺服器
- 📡 **即時同步**：使用 Firestore onSnapshot 取代 WebSocket
- 🚀 **靜態部署**：支援 GitHub Pages 部署
- 📦 **依賴瘦身**：套件從 651 減少到 376

---

## 📄 授權條款

本專案採用 MIT 授權條款。

---

*文件最後更新：2026 年 1 月 18 日*

---

<!-- BEGIN:PROJECT_GUIDE -->
## 專案導覽

吉他點唱系統

- 專案定位：數位內容／AI 創作工具專案
- Repository：`cagoooo/song`
- 可見性：公開
- 主要技術：TypeScript、React、Vite、Firebase、Tailwind CSS、Playwright、Docker
- 線上入口：未在 GitHub repository metadata 設定

### 可以怎麼應用

- 製作教學素材、活動宣傳或學生創作成果
- 把重複的媒體整理、生成與輸出步驟自動化
- 替換模型、提示詞、版型或輸出規格後建立新的內容工作流

這些是依目前專案定位整理的延伸方向，不代表所有情境都已內建完成；實作前請先確認現有功能與資料格式。

### 技術與專案結構

- `README.md`
- `client`
- `docs`
- `firebase.json`
- `package.json`
- `scripts`
- `vite.config.ts`

檔案結構會隨版本演進；若本節與程式碼不一致，以目前預設分支的原始碼為準。

### 本機執行

```bash
npm install
# dev
npm run dev
# build
npm run build
# test
npm run test
# check
npm run check
```
請以 `package.json` 的 `scripts` 為準；若專案需要雲端服務，請先建立自己的環境變數與測試專案。

### 給 AI Agent 的接手指南

1. 先閱讀本 README、`AGENTS.md`（若有）、套件腳本與部署設定。
2. 先確認輸入、處理、輸出三個階段，以及模型／外部服務的邊界。
3. 保留來源、授權、個資與生成內容標示；不要把金鑰寫進前端或版本庫。
4. 修改後用一份最小素材走完整流程，檢查失敗處理與輸出品質。
5. 不要捏造尚未存在的功能；README 與實作有落差時，應同時更新文件。
6. 提交前只納入本次任務檔案，並記錄實際執行過的驗證。

### 安全與資料注意事項

- 不要提交 `.env`、服務帳號、API 金鑰、token、學生個資或正式環境匯出資料。
- 使用 Firebase、Supabase、Google API 或其他雲端服務時，請建立自己的測試專案並套用最小權限。
- 若要公開衍生作品，請先確認程式碼、圖片、音訊、字型與教材內容的授權。

### 貢獻與客製化

歡迎依教學現場、活動或工作流程需求進行 fork／客製化。建議在變更說明中交代使用情境、主要修改、測試方式，以及是否影響資料格式或部署設定。
<!-- END:PROJECT_GUIDE -->
