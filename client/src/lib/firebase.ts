// Firebase 前端配置
import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

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

// 匯出 Firestore 和 Auth 實例
export const db = getFirestore(app);
export const auth = getAuth(app);

// 啟用 Firestore 離線持久化（透過 IndexedDB）
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        // 多個分頁開啟時，只有一個分頁可以使用離線模式
        console.warn('[Firebase] 離線模式：多個分頁開啟，僅限一個分頁使用');
    } else if (err.code === 'unimplemented') {
        // 瀏覽器不支援離線持久化
        console.warn('[Firebase] 離線模式：瀏覽器不支援');
    }
});

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
} as const;
