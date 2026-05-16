// Firebase 前端配置
import { initializeApp } from 'firebase/app';
import { initializeFirestore, memoryLocalCache } from 'firebase/firestore';
import type { Auth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// 初始化 Firebase
export const app = initializeApp(firebaseConfig);

// ==================== Firestore（in-memory cache） ====================
// 改為 memoryLocalCache (不寫 IndexedDB) 換取 ~40KB gzip 主 bundle 縮減。
// 取捨：失去跨 session IndexedDB 快取 → 訪客重新整理會重抓 Firestore 資料。
// 但 onSnapshot listener 仍會即時連線, 多花一次首次 RPC 就好, 不影響功能。
// SW 仍負責 app shell (JS/CSS/HTML) 離線, 此處只影響 data layer。
export const db = initializeFirestore(app, {
    localCache: memoryLocalCache(),
});

// ==================== Auth（lazy load） ====================
// firebase/auth ~150KB 只給管理員登入用，訪客 99% 不需要。
// 改 dynamic import 後從主 bundle 移出，首屏少載 ~40KB gzip。
let authPromise: Promise<Auth> | null = null;
export function getAuthLazy(): Promise<Auth> {
    if (!authPromise) {
        authPromise = import('firebase/auth').then((m) => m.getAuth(app));
    }
    return authPromise;
}

// Collection 名稱常數
export const COLLECTIONS = {
    songs: 'songs',
    votes: 'votes',
    songSuggestions: 'songSuggestions',
    tags: 'tags',
    songTags: 'songTags',
    users: 'users',
    qrCodeScans: 'qrCodeScans',
    playedSongs: 'playedSongs',
    nowPlaying: 'nowPlaying',
    interactions: 'interactions', // 打賞和評分互動事件
    ceremonies: 'ceremonies',     // 演出儀式廣播（開場/中場/過場）
} as const;
