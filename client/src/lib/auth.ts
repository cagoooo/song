// Firebase Authentication 工具函式
// firebase/auth 全部走 dynamic import，把 ~150KB SDK 移出主 bundle
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getAuthLazy, db, COLLECTIONS } from './firebase';

export interface AppUser {
    id: string;
    email: string | null;
    isAdmin: boolean;
}

// 登入
export async function signIn(email: string, password: string): Promise<AppUser> {
    const [auth, { signInWithEmailAndPassword }] = await Promise.all([
        getAuthLazy(),
        import('firebase/auth'),
    ]);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // 從 Firestore 取得使用者額外資訊（如 isAdmin）
    const userDoc = await getDoc(doc(db, COLLECTIONS.users, firebaseUser.uid));
    const userData = userDoc.data();

    return {
        id: firebaseUser.uid,
        email: firebaseUser.email,
        isAdmin: userData?.isAdmin ?? false,
    };
}

// 登出
export async function signOut(): Promise<void> {
    const [auth, { signOut: firebaseSignOut }] = await Promise.all([
        getAuthLazy(),
        import('firebase/auth'),
    ]);
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
                    const userData = userDoc.data();
                    callback({
                        id: firebaseUser.uid,
                        email: firebaseUser.email,
                        isAdmin: userData?.isAdmin ?? false,
                    });
                } catch {
                    callback({
                        id: firebaseUser.uid,
                        email: firebaseUser.email,
                        isAdmin: false,
                    });
                }
            } else {
                callback(null);
            }
        });
    })();

    return () => {
        cancelled = true;
        cleanup?.();
    };
}
