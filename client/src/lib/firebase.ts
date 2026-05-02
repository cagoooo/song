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
// 必須在使用 Firestore / Auth 之前初始化
const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;

// dev 模式可選擇用 debug token；正式部署必須用真 reCAPTCHA。
// 設定 window.FIREBASE_APPCHECK_DEBUG_TOKEN = true 後，第一次 console
// 會印出一組 debug token；到 Firebase Console > App Check 加入該 token，
// localhost 即可順利通過驗證。
if (import.meta.env.DEV && typeof window !== 'undefined') {
    // @ts-expect-error — Firebase 提供的全域旗標，型別未公開
    window.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

if (recaptchaSiteKey) {
    try {
        initializeAppCheck(app, {
            provider: new ReCaptchaV3Provider(recaptchaSiteKey),
            // 自動續 token，避免使用一段時間後過期被拒
            isTokenAutoRefreshEnabled: true,
        });
    } catch (err) {
        // 已初始化過（HMR 場景）會丟錯，可安全忽略
        console.warn('[Firebase] App Check 初始化跳過:', err);
    }
} else {
    console.warn(
        '[Firebase] 未設 VITE_RECAPTCHA_SITE_KEY — App Check 未啟用。' +
        '若 Firestore 規則開了 enforce 會被擋，請參考 .env.example。'
    );
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
