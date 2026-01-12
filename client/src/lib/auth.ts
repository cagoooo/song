// Firebase Authentication 工具函式
import {
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    type User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, COLLECTIONS } from './firebase';

export interface AppUser {
    id: string;
    email: string | null;
    isAdmin: boolean;
}

// 登入
export async function signIn(email: string, password: string): Promise<AppUser> {
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
    await firebaseSignOut(auth);
}

// 取得當前使用者
export function getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
}

// 監聽認證狀態變化
export function onAuthChange(callback: (user: AppUser | null) => void): () => void {
    return onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
            // 從 Firestore 取得使用者額外資訊
            try {
                const userDoc = await getDoc(doc(db, COLLECTIONS.users, firebaseUser.uid));
                const userData = userDoc.data();

                callback({
                    id: firebaseUser.uid,
                    email: firebaseUser.email,
                    isAdmin: userData?.isAdmin ?? false,
                });
            } catch (error) {
                // 如果無法取得 Firestore 資料，使用基本資訊
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
}
