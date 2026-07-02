// Firebase Authentication 工具函式
// firebase/auth 全部走 dynamic import，把 ~150KB SDK 移出主 bundle
//
// U1 多使用者（docs/design/U1-multi-tenant.md）：
//   - 管理員：email/password 登入（現狀不變），資料走根集合
//   - 一般使用者：Google 帳號註冊/登入 → users/{uid} doc（pending 待審核）
//     → 管理員核准（approved）後獲得 tenants/{uid}/** 獨立空間
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAuthLazy, db, COLLECTIONS, setActiveTenant, getResolvedUrlSpace } from './firebase';

/** 使用者審核狀態：pending 待審核 / approved 已開通 / rejected 已停權 */
export type UserStatus = 'pending' | 'approved' | 'rejected';

export interface AppUser {
    id: string;
    email: string | null;
    /**
     * 「目前空間」的管理權：root admin 在根空間、approved 使用者在自己的
     * 租戶空間都是 true — 既有 UI 的 user.isAdmin gating 因此直接適用。
     */
    isAdmin: boolean;
    /** 全站管理員（阿凱）— 使用者審核後台等全站功能以此 gating */
    isRootAdmin: boolean;
    /** 一般使用者的審核狀態；root admin 恆為 approved */
    status: UserStatus;
    displayName?: string | null;
    photoURL?: string | null;
}

/**
 * users/{uid} doc + Firebase user → AppUser，並同步切換租戶空間。
 * 空間解析優先序（Phase 2）：
 *   1. 網址列 ?space={uid}（租戶公開網址）— 誰打開都看那個空間；
 *      只有該空間擁有者本人（approved）拿到管理權，其他人（含 root admin）
 *      一律訪客視角，避免在別人空間亮出按不動的管理 UI。
 *   2. 無 ?space：root admin 與訪客走根集合；approved 使用者走自己的空間；
 *      pending / rejected 以訪客身分看根集合（唯讀）。
 */
function resolveUser(firebaseUser: FirebaseUser, userData: Record<string, unknown> | undefined): AppUser {
    const isRootAdmin = userData?.isAdmin === true;
    const status: UserStatus = isRootAdmin
        ? 'approved'
        : (userData?.status === 'approved' || userData?.status === 'rejected'
            ? userData.status as UserStatus
            : 'pending');
    const ownsTenantSpace = !isRootAdmin && status === 'approved';
    // Phase 3a：網址可能是 slug，getResolvedUrlSpace() 拿到解析後的真正 uid
    const urlSpace = getResolvedUrlSpace();
    const space = urlSpace ?? (ownsTenantSpace ? firebaseUser.uid : null);
    setActiveTenant(space);
    // 「目前空間」的管理權：根空間看 isAdmin 旗標；租戶空間看是否為擁有者本人
    const isSpaceAdmin = space === null
        ? isRootAdmin
        : (ownsTenantSpace && space === firebaseUser.uid);
    return {
        id: firebaseUser.uid,
        email: firebaseUser.email,
        isAdmin: isSpaceAdmin,
        isRootAdmin,
        status,
        displayName: firebaseUser.displayName ?? (userData?.displayName as string | null | undefined) ?? null,
        photoURL: firebaseUser.photoURL ?? null,
    };
}

// 管理員登入（email/password）
export async function signIn(email: string, password: string): Promise<AppUser> {
    const [auth, { signInWithEmailAndPassword }] = await Promise.all([
        getAuthLazy(),
        import('firebase/auth'),
    ]);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // 從 Firestore 取得使用者額外資訊（如 isAdmin）
    const userDoc = await getDoc(doc(db, COLLECTIONS.users, firebaseUser.uid));
    return resolveUser(firebaseUser, userDoc.data());
}

/**
 * Google 帳號註冊 / 登入（同一顆按鈕）：
 * 首次登入自動建立 users/{uid}（status: pending），等待管理員審核。
 * rules 強制新 doc 必須 pending + isAdmin:false，無法自封權限。
 */
export async function signInWithGoogle(): Promise<AppUser> {
    const [auth, { GoogleAuthProvider, signInWithPopup }] = await Promise.all([
        getAuthLazy(),
        import('firebase/auth'),
    ]);
    const credential = await signInWithPopup(auth, new GoogleAuthProvider());
    const firebaseUser = credential.user;

    const userRef = doc(db, COLLECTIONS.users, firebaseUser.uid);
    const snapshot = await getDoc(userRef);
    if (!snapshot.exists()) {
        await setDoc(userRef, {
            email: firebaseUser.email,
            displayName: firebaseUser.displayName ?? null,
            photoURL: firebaseUser.photoURL ?? null,
            isAdmin: false,
            status: 'pending',
            createdAt: serverTimestamp(),
        });
    }
    const userDoc = snapshot.exists() ? snapshot : await getDoc(userRef);
    return resolveUser(firebaseUser, userDoc.data());
}

// 登出
export async function signOut(): Promise<void> {
    const [auth, { signOut: firebaseSignOut }] = await Promise.all([
        getAuthLazy(),
        import('firebase/auth'),
    ]);
    // 登出後回到「這個網址本來的空間」：租戶公開頁留在租戶空間，否則回根
    setActiveTenant(getResolvedUrlSpace());
    await firebaseSignOut(auth);
}

// 取得當前使用者（同步）
// 注意：auth 還沒載入時回傳 null（訪客場景；管理員需先觸發 onAuthChange）
export async function getCurrentUser(): Promise<FirebaseUser | null> {
    const auth = await getAuthLazy();
    return auth.currentUser;
}

// 監聽認證狀態變化
// 回傳 sync unsubscribe（內部 async 載入 firebase/auth，呼叫端介面不變）
// 重要：setActiveTenant 在 callback 通知 UI「之前」完成（resolveUser 內），
// App.tsx 以 spaceKey remount 後，新建立的訂閱一定拿到正確空間。
export function onAuthChange(callback: (user: AppUser | null) => void): () => void {
    let cleanup: (() => void) | null = null;
    let cancelled = false;

    (async () => {
        const [auth, { onAuthStateChanged }] = await Promise.all([
            getAuthLazy(),
            import('firebase/auth'),
        ]);
        if (cancelled) return;
        cleanup = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    const userDoc = await getDoc(doc(db, COLLECTIONS.users, firebaseUser.uid));
                    callback(resolveUser(firebaseUser, userDoc.data()));
                } catch {
                    setActiveTenant(getResolvedUrlSpace());
                    callback({
                        id: firebaseUser.uid,
                        email: firebaseUser.email,
                        isAdmin: false,
                        isRootAdmin: false,
                        status: 'pending',
                        displayName: firebaseUser.displayName ?? null,
                        photoURL: firebaseUser.photoURL ?? null,
                    });
                }
            } else {
                setActiveTenant(getResolvedUrlSpace());
                callback(null);
            }
        });
    })();

    return () => {
        cancelled = true;
        cleanup?.();
    };
}
