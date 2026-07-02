// Firebase 前端配置
import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import {
    initializeFirestore, memoryLocalCache,
    collection, doc, getDoc, type CollectionReference, type DocumentReference,
} from 'firebase/firestore';
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

// ==================== App Check (reCAPTCHA Enterprise) ====================
// 必須在 getFirestore / getAuth 之前 init，否則第一次請求不會帶 App Check token。
// 本地開發時若沒設 site key 就跳過（避免 init 崩潰），生產環境部署一定要設。
const appCheckSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
if (appCheckSiteKey) {
    // Dev 環境啟用 debug token：第一次跑會在 console 印出一組 token，
    // 把它貼到 Firebase Console → App Check → Apps → Debug tokens 即可在 localhost 測。
    if (import.meta.env.DEV) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
    initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
        isTokenAutoRefreshEnabled: true,
    });
} else if (import.meta.env.PROD) {
    // 生產環境沒設 site key = 設定錯誤，要明顯警告（不阻斷服務）
    console.warn(
        '[App Check] VITE_RECAPTCHA_SITE_KEY 未設定，Firestore 請求不會帶 App Check token。' +
        '請到 GitHub Secrets 補上，並確認 deploy.yml 有把它傳進 build env。',
    );
}

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

// ==================== 租戶空間（U1 多使用者） ====================
// 設計文件：docs/design/U1-multi-tenant.md
// 訪客與 root admin（阿凱）走根集合（歷史資料零遷移）；
// 審核通過的一般使用者走 tenants/{uid}/{collection} 子集合 — 整套系統
// 在自己的空白空間運作，歌單與阿凱的完全隔離。
// 切換時機：auth.ts 的 onAuthChange 在通知 UI 前先呼叫 setActiveTenant，
// App.tsx 以 spaceKey remount 整棵樹讓所有 onSnapshot 換到新空間。

// Phase 2：租戶公開網址 ?space={uid} — 訪客打開這種連結，整套系統
// （歌單 / 投票 / 排行 / 正在彈奏）直接落在該租戶空間，可投票互動。
// 開機時同步解析（在任何 onSnapshot 訂閱建立之前），未登入訪客立即生效。
const SPACE_ID_RE = /^[A-Za-z0-9_-]{6,128}$/;
const URL_SPACE: string | null = (() => {
    try {
        const raw = new URLSearchParams(window.location.search).get('space');
        return raw && SPACE_ID_RE.test(raw) ? raw : null;
    } catch {
        return null;
    }
})();

/** 網址列指定的租戶空間（?space=uid 或 ?space=slug）；無或格式不合法回 null */
export function getUrlSpace(): string | null {
    return URL_SPACE;
}

let activeTenant: string | null = URL_SPACE;
// Phase 3a 短網址：URL_SPACE 若是 slug（非 uid 格式），resolvedUrlTenant 會在
// 一次 Firestore 查詢後變成真正的 uid；查詢完成前兩者相同（best-effort 直連）。
let resolvedUrlTenant: string | null = URL_SPACE;

/** 目前「網址空間」解析後的真正 uid（slug 已轉換）；查詢完成前回傳原始值 */
export function getResolvedUrlSpace(): string | null {
    return resolvedUrlTenant;
}

const spaceListeners = new Set<() => void>();

/** 訂閱 activeTenant 變化（Phase 3a slug 解析完成時會觸發一次） */
export function subscribeActiveTenant(callback: () => void): () => void {
    spaceListeners.add(callback);
    return () => spaceListeners.delete(callback);
}

/** null = 根集合（訪客 / root admin）；uid = 該使用者的獨立空間 */
export function setActiveTenant(uid: string | null): void {
    activeTenant = uid;
    spaceListeners.forEach((cb) => cb());
}

export function getActiveTenant(): string | null {
    return activeTenant;
}

// Phase 3a：好記短網址 — ?space=my-band 這種 slug，對照 spaceSlugs/{slug}
// 換成真正的 uid。Firebase Auth uid 固定 28 碼英數字；slug 允許 3-32 碼
// 小寫英數字/dash，兩種格式不重疊，可以不查詢就分辨（uid 連結零延遲直連，
// 只有 slug 連結才需要多一次 Firestore 讀取）。
const FIREBASE_UID_RE = /^[A-Za-z0-9]{28}$/;
if (URL_SPACE && !FIREBASE_UID_RE.test(URL_SPACE)) {
    void (async () => {
        try {
            const snap = await getDoc(doc(db, 'spaceSlugs', URL_SPACE));
            const uid = snap.exists() ? (snap.data().uid as string | undefined) : undefined;
            if (uid) {
                resolvedUrlTenant = uid;
                setActiveTenant(uid);
            }
        } catch {
            // 查不到就維持原樣 — 交給既有「空租戶空間」畫面處理（等同無效連結）
        }
    })();
}

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

/** 取集合參照 — 依 activeTenant 決定根集合或租戶子集合 */
export function col(name: CollectionName): CollectionReference {
    return activeTenant
        ? collection(db, 'tenants', activeTenant, name)
        : collection(db, name);
}

/** 取文件參照 — 同 col()，給 doc(db, COLLECTIONS.x, id) 的既有呼叫改用 */
export function docRef(name: CollectionName, id: string): DocumentReference {
    return activeTenant
        ? doc(db, 'tenants', activeTenant, name, id)
        : doc(db, name, id);
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
    funnelEvents: 'funnelEvents', // 跨裝置漏斗彙整（核心轉換事件）
    // D1 雜誌期數系統
    settings: 'settings', // settings/magazine 單一 doc
    issues: 'issues',     // 歸檔的歷史期數
} as const;
