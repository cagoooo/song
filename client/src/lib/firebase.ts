// Firebase 前端配置
import { initializeApp } from 'firebase/app';
import {
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

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

// ==================== App Check（防機器人 / 假流量） ====================
// ⚠️ 暫時停用 — Firebase Console 那邊「應用程式註冊」未完成導致
// exchangeRecaptchaV3Token 400, 同時讓 Firestore 把所有請求視為
// 「App Check 失敗」拒絕 (即使 enforce 是 UNENFORCED)。
//
// 復用流程:
// 1. Firebase Console > App Check > 應用程式 註冊本 web app +
//    貼上 site key 6LcWuNQs...
// 2. 測試 console 不再出現 400
// 3. 把下方 ENABLE_APP_CHECK 改為 true 重新部署
// 4. 觀察 24h 沒問題 -> Console > API > Firestore 切「強制執行」
const ENABLE_APP_CHECK = false;
const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;

if (import.meta.env.DEV && typeof window !== 'undefined') {
    // @ts-expect-error — Firebase 全域旗標
    window.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

if (ENABLE_APP_CHECK && recaptchaSiteKey) {
    try {
        initializeAppCheck(app, {
            provider: new ReCaptchaV3Provider(recaptchaSiteKey),
            isTokenAutoRefreshEnabled: true,
        });
    } catch (err) {
        console.warn('[Firebase] App Check 初始化跳過:', err);
    }
}

// ==================== Firestore（離線持久化新 API） ====================
// 取代已棄用的 enableIndexedDbPersistence；多分頁同步用 persistentMultipleTabManager
// 支援 A/B 兩個分頁同時離線快取，不會再出現 IndexedDB 互鎖警告。
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
    }),
});

export const auth = getAuth(app);

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
