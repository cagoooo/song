// U1 Phase 3a — 好記短網址（spaceSlugs 對照表）
// 設計文件：docs/design/U1-multi-tenant.md
// spaceSlugs/{slug} 是根集合的全域對照表（{ uid }），users/{uid}.slug 記著
// 使用者目前設定的 slug（自助更新，方便 UI 顯示/清除）。兩者用 transaction
// 一起寫入，確保「一個 slug 只對應一個 uid」且切換 slug 時舊的會被釋放。
import { doc, getDoc, runTransaction } from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase';
import { isValidSlug } from '../spaceUrl';

/** 幫指定使用者設定 / 更換公開短網址 slug；slug 已被別人佔用會丟錯 */
export async function claimSpaceSlug(uid: string, rawSlug: string): Promise<void> {
    const slug = rawSlug.trim().toLowerCase();
    if (!isValidSlug(slug)) {
        throw new Error('網址代碼需為 3-32 碼小寫英文字母、數字或 -（不可開頭/結尾/連續使用 -）');
    }

    const userRef = doc(db, COLLECTIONS.users, uid);
    const newSlugRef = doc(db, 'spaceSlugs', slug);

    await runTransaction(db, async (tx) => {
        const [userSnap, newSlugSnap] = await Promise.all([tx.get(userRef), tx.get(newSlugRef)]);
        const existingOwner = newSlugSnap.exists() ? (newSlugSnap.data().uid as string) : null;
        if (existingOwner && existingOwner !== uid) {
            throw new Error('這個網址代碼已經有人使用了，請換一個。');
        }
        const oldSlug = (userSnap.data()?.slug as string | undefined) ?? null;
        if (oldSlug && oldSlug !== slug) {
            tx.delete(doc(db, 'spaceSlugs', oldSlug));
        }
        tx.set(newSlugRef, { uid });
        tx.update(userRef, { slug });
    });
}

/** 清除使用者目前的 slug（改回用 uid 的公開網址） */
export async function releaseSpaceSlug(uid: string): Promise<void> {
    const userRef = doc(db, COLLECTIONS.users, uid);
    await runTransaction(db, async (tx) => {
        const userSnap = await tx.get(userRef);
        const oldSlug = (userSnap.data()?.slug as string | undefined) ?? null;
        if (oldSlug) {
            tx.delete(doc(db, 'spaceSlugs', oldSlug));
        }
        tx.update(userRef, { slug: null });
    });
}

/** 讀取使用者目前設定的 slug（沒設定回 null） */
export async function getSpaceSlug(uid: string): Promise<string | null> {
    const snap = await getDoc(doc(db, COLLECTIONS.users, uid));
    return (snap.data()?.slug as string | undefined) ?? null;
}
