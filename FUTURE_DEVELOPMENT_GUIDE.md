# 🚀 互動式吉他彈唱點播平台 - 未來開發詳細指南

> **文件版本**: 1.0  
> **建立日期**: 2026-01-13  
> **適用版本**: v2.0.0+  
> **目的**: 提供具體、可執行的開發建議與實作細節

---

## 📋 目錄

1. [快速導覽](#快速導覽)
2. [立即可做的優化 (1-3 天)](#立即可做的優化-1-3-天)
3. [短期強化項目 (1-2 週)](#短期強化項目-1-2-週)
4. [中期功能開發 (2-4 週)](#中期功能開發-2-4-週)
5. [長期進階發展 (1-3 個月)](#長期進階發展-1-3-個月)
6. [程式碼品質提升](#程式碼品質提升)
7. [效能優化策略](#效能優化策略)
8. [部署與維運建議](#部署與維運建議)
9. [商業化方向探索](#商業化方向探索)
10. [學習資源與參考](#學習資源與參考)

---

## 快速導覽

### 🎯 優先級分類

| 標記 | 等級 | 建議投入 | 預期收益 |
|------|------|----------|----------|
| 🔥 | 立即 | 1-3 天 | 快速見效，低風險 |
| ⭐ | 短期 | 1-2 週 | 顯著改善，中等投入 |
| 🚀 | 中期 | 2-4 週 | 功能擴展，用戶價值高 |
| 🌟 | 長期 | 1-3 個月 | 進階功能，高複雜度 |

### 📊 建議優先順序圖

```
重要程度
   ↑
高 │  🔥 TypeScript 嚴格模式    ⭐ PWA 離線支援
   │  🔥 標籤系統修復           ⭐ 社群登入整合
   │  🔥 錯誤處理優化           🚀 歌詞同步播放
中 │  ⭐ 元件拆分重構           🚀 統計儀表板
   │  ⭐ 效能監控              🌟 通知系統
低 │  🌟 多語系支援             🌟 A/B 測試
   └──────────────────────────────────────────→
      低                                    高
                  實施複雜度
```

---

## 🔥 立即可做的優化 (1-3 天)

### 1. TypeScript 嚴格模式恢復

**問題描述**：  
目前 `tsconfig.json` 中 `strict` 和 `noImplicitAny` 設為 `false`，可能導致潛在的型別錯誤被忽略。

**實施步驟**：

#### Step 1：漸進式啟用嚴格模式

```json
// tsconfig.json - 階段 1
{
  "compilerOptions": {
    "strict": false,
    "noImplicitAny": true,  // 先啟用這個
    "strictNullChecks": false,
    "strictFunctionTypes": false
  }
}
```

#### Step 2：修復主要問題檔案

| 檔案 | 問題 | 修復建議 |
|------|------|----------|
| `TagSelector.tsx` | 使用舊 API 呼叫 | 改用 `firestore.ts` 函式 |
| `MusicPlayer.tsx` | 隱式 any 型別 | 添加 `ITrack` 介面 |
| `RankingBoard.tsx` | 複雜狀態型別 | 使用泛型定義 |
| `SongList.tsx` | 過大元件 | 拆分子元件 |

#### Step 3：完全啟用嚴格模式

```json
// tsconfig.json - 最終版本
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**驗證方法**：
```bash
npm run check  # 確保無 TypeScript 錯誤
npm run build  # 確保建置成功
```

---

### 2. 標籤系統 Firestore 遷移

**問題描述**：  
`TagSelector.tsx` 仍殘留舊 API 呼叫，需完全遷移至 Firestore。

**建議新增 Hook**：

```typescript
// client/src/hooks/use-tags.ts
import { useState, useEffect, useCallback } from 'react';
import { 
  getTags, 
  addTag, 
  getSongTags, 
  addSongTag, 
  removeSongTag 
} from '@/lib/firestore';

interface Tag {
  id: string;
  name: string;
  color?: string;
}

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      const fetchedTags = await getTags();
      setTags(fetchedTags);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('載入標籤失敗'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const createTag = async (name: string, color?: string) => {
    const newTag = await addTag(name, color);
    await fetchTags(); // 重新載入
    return newTag;
  };

  return {
    tags,
    loading,
    error,
    createTag,
    getSongTags,
    addSongTag,
    removeSongTag,
    refetch: fetchTags,
  };
}
```

---

### 3. 友善錯誤處理

**建議新增錯誤處理模組**：

```typescript
// client/src/lib/error-handler.ts
import { FirebaseError } from 'firebase/app';
import { toast } from '@/components/ui/sonner'; // 假設使用 sonner

// 錯誤碼對應中文訊息
const ERROR_MESSAGES: Record<string, string> = {
  // Firestore 錯誤
  'permission-denied': '您沒有權限執行此操作',
  'unavailable': '伺服器暫時無法使用，請稍後再試',
  'not-found': '找不到請求的資源',
  'already-exists': '此項目已存在',
  'resource-exhausted': '請求過於頻繁，請稍後再試',
  'cancelled': '操作已取消',
  'data-loss': '資料遺失，請聯繫管理員',
  'unauthenticated': '請先登入後再操作',
  
  // Auth 錯誤
  'auth/user-not-found': '找不到此使用者',
  'auth/wrong-password': '密碼錯誤',
  'auth/email-already-in-use': '此電子郵件已被使用',
  'auth/too-many-requests': '登入嘗試過多，請稍後再試',
  'auth/network-request-failed': '網路連線失敗',
};

export function handleError(error: unknown): string {
  if (error instanceof FirebaseError) {
    return ERROR_MESSAGES[error.code] || `發生錯誤：${error.message}`;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return '發生未知錯誤，請稍後再試';
}

// 顯示錯誤提示
export function showError(error: unknown) {
  const message = handleError(error);
  toast.error(message);
  
  // 開發環境下印出完整錯誤
  if (import.meta.env.DEV) {
    console.error('Error details:', error);
  }
}

// 包裝 async 函式並自動處理錯誤
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options?: { showToast?: boolean }
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (options?.showToast !== false) {
        showError(error);
      }
      throw error;
    }
  }) as T;
}
```

---

## ⭐ 短期強化項目 (1-2 週)

### 4. 大型元件拆分重構

**現況問題**：
- `SongList.tsx` 約 45KB / 1000+ 行
- `RankingBoard.tsx` 約 49KB
- `SongSuggestion.tsx` 約 34KB

**建議拆分方案**：

```
SongList.tsx (45KB)
├── SongList.tsx (主容器，約 10KB)
├── SongCard.tsx (單一歌曲卡片)
├── SongFilters.tsx (篩選控制區)
├── SongActions.tsx (批量操作工具列)
├── SongEditModal.tsx (編輯彈窗)
└── hooks/
    ├── useSongList.ts (列表狀態管理)
    ├── useSongFilters.ts (篩選邏輯)
    └── useSongActions.ts (操作邏輯)
```

**拆分範例**：

```typescript
// components/SongCard.tsx
import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TagBadge } from './TagBadge';

interface SongCardProps {
  song: Song;
  isSelected: boolean;
  onVote: (songId: string) => void;
  onEdit?: (song: Song) => void;
  onSelect?: (songId: string) => void;
}

// 使用 React.memo 優化重渲染
export const SongCard = memo<SongCardProps>(({ 
  song, 
  isSelected,
  onVote, 
  onEdit, 
  onSelect 
}) => {
  return (
    <Card className={isSelected ? 'ring-2 ring-primary' : ''}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="font-semibold">{song.title}</h3>
            <p className="text-sm text-muted-foreground">{song.artist}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">{song.votes}</span>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => onVote(song.id)}
            >
              點播
            </Button>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {song.tags?.map(tag => (
            <TagBadge key={tag.id} tag={tag} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) => {
  // 自訂比較函式，優化效能
  return (
    prevProps.song.id === nextProps.song.id &&
    prevProps.song.votes === nextProps.song.votes &&
    prevProps.isSelected === nextProps.isSelected
  );
});

SongCard.displayName = 'SongCard';
```

---

### 5. 網路狀態監控

**建議新增網路狀態 Hook**：

```typescript
// client/src/hooks/use-network-status.ts
import { useState, useEffect, useCallback } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string;
}

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    isSlowConnection: false,
    connectionType: 'unknown',
  });

  const updateNetworkStatus = useCallback(() => {
    const connection = (navigator as any).connection;
    
    setStatus({
      isOnline: navigator.onLine,
      isSlowConnection: connection?.effectiveType === '2g' || 
                        connection?.effectiveType === 'slow-2g',
      connectionType: connection?.effectiveType || 'unknown',
    });
  }, []);

  useEffect(() => {
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', updateNetworkStatus);
    }

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
      if (connection) {
        connection.removeEventListener('change', updateNetworkStatus);
      }
    };
  }, [updateNetworkStatus]);

  return status;
}
```

**整合至 App**：

```typescript
// components/NetworkStatusBanner.tsx
import { useNetworkStatus } from '@/hooks/use-network-status';
import { WifiOff, AlertTriangle } from 'lucide-react';

export function NetworkStatusBanner() {
  const { isOnline, isSlowConnection } = useNetworkStatus();

  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-red-500 text-white py-2 px-4 flex items-center justify-center gap-2">
        <WifiOff className="h-4 w-4" />
        <span>網路連線中斷，部分功能無法使用</span>
      </div>
    );
  }

  if (isSlowConnection) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-black py-2 px-4 flex items-center justify-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        <span>網路連線緩慢</span>
      </div>
    );
  }

  return null;
}
```

---

### 6. 效能監控整合

**建議使用 Firebase Performance**：

```typescript
// client/src/lib/performance.ts
import { getPerformance, trace } from 'firebase/performance';
import { app } from './firebase';

// 初始化 Performance Monitoring
const perf = getPerformance(app);

// 自訂效能追蹤
export function createTrace(name: string) {
  return trace(perf, name);
}

// 追蹤頁面載入
export function trackPageLoad(pageName: string) {
  const pageTrace = createTrace(`page_load_${pageName}`);
  pageTrace.start();
  
  window.addEventListener('load', () => {
    pageTrace.stop();
  }, { once: true });
}

// 追蹤 API 呼叫
export async function trackApiCall<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const apiTrace = createTrace(`api_${name}`);
  apiTrace.start();
  
  try {
    const result = await fn();
    apiTrace.putAttribute('status', 'success');
    return result;
  } catch (error) {
    apiTrace.putAttribute('status', 'error');
    throw error;
  } finally {
    apiTrace.stop();
  }
}
```

---

## 🚀 中期功能開發 (2-4 週)

### 7. PWA 離線支援實作

**安裝依賴**：
```bash
npm install vite-plugin-pwa -D
```

**完整配置**：

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: '互動式吉他彈唱點播平台',
        short_name: '點歌平台',
        description: '即時點播、投票的吉他表演互動平台',
        theme_color: '#f59e0b',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/song/',
        start_url: '/song/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            // 快取 Firebase SDK
            urlPattern: /^https:\/\/www\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'firebase-sdk-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 天
              },
            },
          },
          {
            // 快取 Google Fonts
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 年
              },
            },
          },
        ],
      },
    }),
  ],
});
```

**離線歌單檢視功能**：

```typescript
// client/src/lib/offline-cache.ts
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface SongDB extends DBSchema {
  songs: {
    key: string;
    value: Song;
    indexes: { 'by-votes': number };
  };
  lastSync: {
    key: 'timestamp';
    value: number;
  };
}

class OfflineCache {
  private db: IDBPDatabase<SongDB> | null = null;

  async init() {
    this.db = await openDB<SongDB>('song-cache', 1, {
      upgrade(db) {
        const songStore = db.createObjectStore('songs', { keyPath: 'id' });
        songStore.createIndex('by-votes', 'votes');
        db.createObjectStore('lastSync');
      },
    });
  }

  async cacheSongs(songs: Song[]) {
    if (!this.db) await this.init();
    const tx = this.db!.transaction('songs', 'readwrite');
    await Promise.all(songs.map(song => tx.store.put(song)));
    await tx.done;
    
    // 記錄同步時間
    await this.db!.put('lastSync', Date.now(), 'timestamp');
  }

  async getCachedSongs(): Promise<Song[]> {
    if (!this.db) await this.init();
    return this.db!.getAllFromIndex('songs', 'by-votes');
  }

  async getLastSyncTime(): Promise<number | undefined> {
    if (!this.db) await this.init();
    return this.db!.get('lastSync', 'timestamp');
  }
}

export const offlineCache = new OfflineCache();
```

---

### 8. 歌詞同步播放功能

**資料結構設計**：

```typescript
// types/lyrics.ts
interface LyricLine {
  time: number;      // 秒數
  text: string;      // 歌詞內容
  translation?: string;  // 翻譯 (可選)
}

interface SongLyrics {
  songId: string;
  format: 'lrc' | 'plain';
  lines: LyricLine[];
  source?: string;    // 歌詞來源
  contributor?: string;  // 貢獻者
}

// LRC 格式解析器
export function parseLRC(lrcText: string): LyricLine[] {
  const lines: LyricLine[] = [];
  const regex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)/g;
  
  let match;
  while ((match = regex.exec(lrcText)) !== null) {
    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    const milliseconds = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0;
    
    lines.push({
      time: minutes * 60 + seconds + milliseconds / 1000,
      text: match[4].trim(),
    });
  }
  
  return lines.sort((a, b) => a.time - b.time);
}
```

**歌詞播放器元件**：

```typescript
// components/LyricsPlayer.tsx
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LyricLine } from '@/types/lyrics';

interface LyricsPlayerProps {
  lyrics: LyricLine[];
  currentTime: number;  // 從音頻播放器同步
}

export function LyricsPlayer({ lyrics, currentTime }: LyricsPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const index = lyrics.findIndex((line, i) => {
      const nextLine = lyrics[i + 1];
      return currentTime >= line.time && 
             (!nextLine || currentTime < nextLine.time);
    });
    
    if (index !== -1 && index !== currentIndex) {
      setCurrentIndex(index);
    }
  }, [currentTime, lyrics, currentIndex]);

  // 自動滾動到當前歌詞
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      const currentElement = container.children[currentIndex] as HTMLElement;
      if (currentElement) {
        currentElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }
    }
  }, [currentIndex]);

  return (
    <div 
      ref={containerRef}
      className="h-64 overflow-y-auto scrollbar-hide"
    >
      {lyrics.map((line, index) => (
        <motion.p
          key={`${line.time}-${index}`}
          className={`py-2 px-4 text-center transition-all duration-300 ${
            index === currentIndex
              ? 'text-xl font-bold text-primary'
              : 'text-muted-foreground'
          }`}
          initial={{ opacity: 0.5, scale: 0.95 }}
          animate={{
            opacity: index === currentIndex ? 1 : 0.5,
            scale: index === currentIndex ? 1 : 0.95,
          }}
        >
          {line.text}
        </motion.p>
      ))}
    </div>
  );
}
```

---

### 9. 統計儀表板開發

**資料收集結構**：

```typescript
// lib/analytics.ts
import { 
  collection, 
  doc, 
  setDoc, 
  increment, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';

// 記錄點播事件
export async function logVoteEvent(songId: string, songTitle: string) {
  const today = new Date().toISOString().split('T')[0];
  const hour = new Date().getHours().toString();
  
  // 更新每日統計
  const dailyRef = doc(db, 'stats', today);
  await setDoc(dailyRef, {
    totalVotes: increment(1),
    lastUpdated: serverTimestamp(),
    [`hourly.${hour}`]: increment(1),
    [`songs.${songId}`]: increment(1),
  }, { merge: true });
}

// 取得統計數據
export async function getStats(days: number = 7) {
  const stats: DailyStats[] = [];
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const docRef = doc(db, 'stats', dateStr);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      stats.push({
        date: dateStr,
        ...docSnap.data() as Omit<DailyStats, 'date'>,
      });
    }
  }
  
  return stats;
}
```

**儀表板元件建議**：

```
StatsDashboard/
├── index.tsx (主頁面)
├── TrendChart.tsx (趨勢折線圖 - 使用 recharts)
├── HourlyHeatmap.tsx (時段熱力圖)
├── TopSongsChart.tsx (熱門歌曲長條圖)
├── QuickStats.tsx (快速統計卡片)
└── hooks/
    └── useStats.ts (統計數據 Hook)
```

---

## 🌟 長期進階發展 (1-3 個月)

### 10. 多語系支援 (i18n)

**安裝依賴**：
```bash
npm install react-i18next i18next i18next-browser-languagedetector
```

**基礎設置**：

```typescript
// lib/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 翻譯資源
const resources = {
  'zh-TW': {
    translation: {
      common: {
        vote: '點播',
        songs: '歌曲',
        ranking: '排行榜',
        suggest: '建議歌曲',
        admin: '管理員',
        login: '登入',
        logout: '登出',
        search: '搜尋',
        loading: '載入中...',
        error: '發生錯誤',
        retry: '重試',
        save: '儲存',
        cancel: '取消',
        delete: '刪除',
        edit: '編輯',
        confirm: '確認',
      },
      song: {
        title: '歌曲名稱',
        artist: '歌手/演唱者',
        votes: '點播次數',
        tags: '標籤',
        addSuccess: '歌曲新增成功！',
        voteSuccess: '點播成功！',
        voteCooldown: '請稍候 {{seconds}} 秒後再點播',
      },
      ranking: {
        top: '排行榜 TOP',
        noSongs: '目前沒有歌曲',
        refresh: '重新整理',
      },
      // ... 更多翻譯
    },
  },
  en: {
    translation: {
      common: {
        vote: 'Vote',
        songs: 'Songs',
        ranking: 'Ranking',
        suggest: 'Suggest Song',
        admin: 'Admin',
        login: 'Login',
        logout: 'Logout',
        search: 'Search',
        loading: 'Loading...',
        error: 'Error occurred',
        retry: 'Retry',
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        confirm: 'Confirm',
      },
      song: {
        title: 'Song Title',
        artist: 'Artist',
        votes: 'Votes',
        tags: 'Tags',
        addSuccess: 'Song added successfully!',
        voteSuccess: 'Vote submitted!',
        voteCooldown: 'Please wait {{seconds}} seconds',
      },
      ranking: {
        top: 'TOP Ranking',
        noSongs: 'No songs available',
        refresh: 'Refresh',
      },
    },
  },
  ja: {
    translation: {
      common: {
        vote: 'リクエスト',
        songs: '曲リスト',
        ranking: 'ランキング',
        suggest: '曲を提案',
        admin: '管理者',
        login: 'ログイン',
        logout: 'ログアウト',
        search: '検索',
        loading: '読み込み中...',
      },
      // ... 其他翻譯
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh-TW',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
```

**語言切換元件**：

```typescript
// components/LanguageSwitcher.tsx
import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const LANGUAGES = [
  { code: 'zh-TW', label: '繁體中文', flag: '🇹🇼' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <Select value={i18n.language} onValueChange={i18n.changeLanguage}>
      <SelectTrigger className="w-[140px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LANGUAGES.map(({ code, label, flag }) => (
          <SelectItem key={code} value={code}>
            <span className="flex items-center gap-2">
              <span>{flag}</span>
              <span>{label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

---

### 11. 進階推播通知系統

**Firebase Cloud Messaging 設定**：

```typescript
// lib/messaging.ts
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from './firebase';

const messaging = getMessaging(app);

// 請求通知權限並取得 Token
export async function requestNotificationPermission(): Promise<string | null> {
  try {
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      });
      
      // 儲存 token 到 Firestore 供後端使用
      await saveUserToken(token);
      
      return token;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting notification token:', error);
    return null;
  }
}

// 前景訊息處理
export function setupForegroundMessageHandler() {
  onMessage(messaging, (payload) => {
    console.log('Received foreground message', payload);
    
    // 顯示本地通知
    if (payload.notification) {
      new Notification(payload.notification.title || '新通知', {
        body: payload.notification.body,
        icon: '/pwa-192x192.png',
      });
    }
  });
}

// 通知類型定義
type NotificationType = 
  | 'song_trending'    // 歌曲進入排行榜前 3
  | 'suggestion_approved'  // 建議被採納
  | 'new_song_added'   // 新歌曲上架
  | 'event_starting';  // 活動即將開始
```

---

### 12. A/B 測試框架

```typescript
// lib/experiments.ts
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

interface Experiment {
  id: string;
  name: string;
  variants: string[];
  weights?: number[];
  enabled: boolean;
}

class ExperimentManager {
  private experiments: Map<string, string> = new Map();
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
    this.loadExperiments();
  }

  private async loadExperiments() {
    // 從 Firestore 或 localStorage 載入使用者已分配的實驗
    const cached = localStorage.getItem(`experiments_${this.userId}`);
    if (cached) {
      const data = JSON.parse(cached);
      Object.entries(data).forEach(([key, value]) => {
        this.experiments.set(key, value as string);
      });
    }
  }

  async getVariant(experimentId: string): Promise<string> {
    // 檢查是否已分配
    if (this.experiments.has(experimentId)) {
      return this.experiments.get(experimentId)!;
    }

    // 從 Firestore 取得實驗配置
    const expDoc = await getDoc(doc(db, 'experiments', experimentId));
    if (!expDoc.exists() || !expDoc.data().enabled) {
      return 'control';
    }

    const { variants, weights } = expDoc.data() as Experiment;
    
    // 加權隨機分配
    const variant = this.weightedRandom(variants, weights);
    
    // 儲存分配結果
    this.experiments.set(experimentId, variant);
    this.saveExperiments();
    
    // 記錄到 Firestore
    await this.logAssignment(experimentId, variant);
    
    return variant;
  }

  private weightedRandom(variants: string[], weights?: number[]): string {
    if (!weights) {
      return variants[Math.floor(Math.random() * variants.length)];
    }

    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < variants.length; i++) {
      random -= weights[i];
      if (random <= 0) return variants[i];
    }
    
    return variants[variants.length - 1];
  }

  private saveExperiments() {
    localStorage.setItem(
      `experiments_${this.userId}`,
      JSON.stringify(Object.fromEntries(this.experiments))
    );
  }

  private async logAssignment(experimentId: string, variant: string) {
    await setDoc(
      doc(db, 'experimentAssignments', `${this.userId}_${experimentId}`),
      {
        userId: this.userId,
        experimentId,
        variant,
        assignedAt: new Date(),
      }
    );
  }
}

// 使用範例
// const expManager = new ExperimentManager(userId);
// const buttonVariant = await expManager.getVariant('vote_button_style');
// if (buttonVariant === 'animated') { ... }
```

---

## 📦 程式碼品質提升

### 13. ESLint + Prettier 設定

```bash
npm install -D eslint prettier eslint-config-prettier eslint-plugin-react-hooks @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

```javascript
// .eslintrc.cjs
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
};
```

```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

### 14. Pre-commit Hooks (Husky + lint-staged)

```bash
npm install -D husky lint-staged
npx husky init
```

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{css,json,md}": [
      "prettier --write"
    ]
  }
}
```

```bash
# .husky/pre-commit
npm run lint-staged
npm run check
```

### 15. 單元測試設置

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @testing-library/user-event
```

```typescript
// vite.config.ts - 新增測試配置
export default defineConfig({
  // ... 其他配置
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

```typescript
// client/src/test/setup.ts
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Firebase
vi.mock('@/lib/firebase', () => ({
  db: {},
  auth: {},
  app: {},
}));
```

**測試範例**：

```typescript
// client/src/components/__tests__/SongCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SongCard } from '../SongCard';

const mockSong = {
  id: '1',
  title: '告白氣球',
  artist: '周杰倫',
  votes: 10,
  tags: [],
};

describe('SongCard', () => {
  it('renders song title and artist', () => {
    render(
      <SongCard 
        song={mockSong} 
        isSelected={false}
        onVote={vi.fn()} 
      />
    );
    
    expect(screen.getByText('告白氣球')).toBeInTheDocument();
    expect(screen.getByText('周杰倫')).toBeInTheDocument();
  });

  it('calls onVote when vote button is clicked', () => {
    const mockOnVote = vi.fn();
    render(
      <SongCard 
        song={mockSong}
        isSelected={false}
        onVote={mockOnVote} 
      />
    );
    
    fireEvent.click(screen.getByRole('button', { name: /點播/i }));
    expect(mockOnVote).toHaveBeenCalledWith('1');
  });

  it('shows selected state correctly', () => {
    const { container } = render(
      <SongCard 
        song={mockSong}
        isSelected={true}
        onVote={vi.fn()} 
      />
    );
    
    expect(container.querySelector('.ring-primary')).toBeInTheDocument();
  });
});
```

---

## ⚡ 效能優化策略

### 16. 程式碼分割

```typescript
// App.tsx 使用 React.lazy
import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// 延遲載入較大的元件
const RankingBoard = lazy(() => import('./components/RankingBoard'));
const SongSuggestion = lazy(() => import('./components/SongSuggestion'));
const MusicPlayer = lazy(() => import('./components/MusicPlayer'));
const StatsDashboard = lazy(() => import('./components/StatsDashboard'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      {/* 元件使用 */}
    </Suspense>
  );
}
```

### 17. 圖片優化策略

```typescript
// components/OptimizedImage.tsx
interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
}

export function OptimizedImage({ 
  src, 
  alt, 
  width, 
  height, 
  className 
}: OptimizedImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      className={className}
      onError={(e) => {
        // 載入失敗時顯示預設圖
        (e.target as HTMLImageElement).src = '/placeholder.png';
      }}
    />
  );
}
```

### 18. Firestore 查詢優化

```typescript
// lib/firestore-optimized.ts
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  startAfter,
  getDocs,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from './firebase';

interface PaginatedResult<T> {
  items: T[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

// 分頁載入歌曲
export async function getSongsPaginated(
  pageSize: number = 20,
  lastDocument?: QueryDocumentSnapshot<DocumentData>
): Promise<PaginatedResult<Song>> {
  let q = query(
    collection(db, 'songs'),
    orderBy('votes', 'desc'),
    limit(pageSize + 1)  // 多取一筆判斷是否還有更多
  );

  if (lastDocument) {
    q = query(q, startAfter(lastDocument));
  }

  const snapshot = await getDocs(q);
  const docs = snapshot.docs;
  const hasMore = docs.length > pageSize;
  
  // 如果有多餘的，移除最後一筆
  const items = docs.slice(0, pageSize).map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as Song));

  return {
    items,
    lastDoc: docs.length > 0 ? docs[docs.length - 1] : null,
    hasMore,
  };
}
```

---

## 🚢 部署與維運建議

### 19. CI/CD 增強

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Type check
        run: npm run check
      
      - name: Lint
        run: npm run lint
      
      - name: Run tests
        run: npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          # ... 其他環境變數
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
```

### 20. 監控與告警

**建議整合以下工具**：

| 工具 | 用途 | 成本 |
|------|------|------|
| Firebase Analytics | 使用者行為分析 | 免費 |
| Firebase Performance | 效能監控 | 免費 |
| Firebase Crashlytics | 錯誤追蹤 | 免費 |
| Sentry | 進階錯誤追蹤 | 免費方案可用 |
| Uptime Robot | 可用性監控 | 免費 |

---

## 💰 商業化方向探索

### 21. 潛在商業模式

| 模式 | 說明 | 可行性 |
|------|------|--------|
| **訂閱制** | 月費解鎖進階功能 | ⭐⭐⭐ |
| **打賞功能** | 觀眾打賞表演者 | ⭐⭐⭐⭐ |
| **活動包場** | B2B 活動場地租借 | ⭐⭐⭐ |
| **廣告收入** | 歌曲間插播廣告 | ⭐⭐ |
| **硬體整合** | 販售專用投影/觸控設備 | ⭐ |

### 22. VIP 會員功能規劃

```typescript
// types/membership.ts
interface MembershipTier {
  id: 'free' | 'basic' | 'premium';
  name: string;
  price: number;  // 月費 (TWD)
  features: string[];
}

const MEMBERSHIP_TIERS: MembershipTier[] = [
  {
    id: 'free',
    name: '免費會員',
    price: 0,
    features: [
      '每日 10 次點播',
      '基本排行榜查看',
      '歌曲建議功能',
    ],
  },
  {
    id: 'basic',
    name: '基本會員',
    price: 99,
    features: [
      '無限次點播',
      '優先點播權',
      '點播歷史記錄',
      '專屬會員徽章',
      '去除廣告',
    ],
  },
  {
    id: 'premium',
    name: '尊榮會員',
    price: 299,
    features: [
      '所有基本會員功能',
      '超級優先點播權',
      '專屬歌單建立',
      '離線歌詞查看',
      '專屬客服支援',
      '每月贈送點數',
    ],
  },
];
```

---

## 📚 學習資源與參考

### 推薦學習資源

| 主題 | 資源 | 說明 |
|------|------|------|
| TypeScript | [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/) | 官方教學 |
| React Patterns | [Patterns.dev](https://patterns.dev/) | 現代設計模式 |
| Firebase | [Firebase Documentation](https://firebase.google.com/docs) | 官方文件 |
| PWA | [web.dev PWA](https://web.dev/progressive-web-apps/) | Google 教學 |
| 效能優化 | [Web Vitals](https://web.dev/vitals/) | 核心指標 |
| 測試 | [Testing Library](https://testing-library.com/) | 測試最佳實踐 |

### 相關技術社群

- [React Taiwan](https://www.facebook.com/groups/reactjs.tw/)
- [Firebase Taiwan](https://www.facebook.com/groups/firebase.tw/)
- [TypeScript Taiwan](https://discord.gg/typescript-tw)

---

## 📝 附錄：檢查清單

### 開發前檢查

- [ ] 已閱讀相關文件 (`README.md`, `DEVELOPMENT_ROADMAP.md`)
- [ ] 已取得 Firebase 專案存取權限
- [ ] 已設定本地開發環境
- [ ] 已理解現有架構和程式碼風格

### 功能開發檢查

- [ ] 已建立對應的 TypeScript 型別
- [ ] 已處理錯誤情況並提供友善訊息
- [ ] 已考慮載入狀態和骨架屏
- [ ] 已實作響應式設計
- [ ] 已添加必要的單元測試
- [ ] 已更新相關文件

### 部署前檢查

- [ ] TypeScript 編譯無錯誤 (`npm run check`)
- [ ] 所有測試通過 (`npm run test`)
- [ ] ESLint 無警告 (`npm run lint`)
- [ ] 建置成功 (`npm run build`)
- [ ] 本地預覽正常 (`npm run preview`)

---

*此文件將持續更新，歡迎提出建議與意見！*  
*最後更新：2026-01-13*
