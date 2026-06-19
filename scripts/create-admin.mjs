// 建立或更新 Firebase 後台管理員帳號。
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({
    projectId: 'guitar-ff931',
});

const auth = getAuth();
const db = getFirestore();

async function createAdmin() {
    const password = process.argv[2];
    const email = process.argv[3] || 'ipad@mail2.smes.tyc.edu.tw';

    if (!password) {
        console.error('請提供密碼：node scripts/create-admin.mjs <password> [email]');
        process.exit(1);
    }

    try {
        let user;

        try {
            user = await auth.getUserByEmail(email);
            user = await auth.updateUser(user.uid, {
                email,
                password,
                displayName: user.displayName || 'Admin',
            });
            console.log(`已更新管理員帳號: ${user.uid}`);
        } catch (error) {
            if (error?.code !== 'auth/user-not-found') throw error;

            user = await auth.createUser({
                email,
                password,
                displayName: 'Admin',
            });
            console.log(`已建立管理員帳號: ${user.uid}`);
        }

        await db.collection('users').doc(user.uid).set({
            email: user.email,
            isAdmin: true,
            updatedAt: new Date(),
        }, { merge: true });

        console.log(`已設定 ${email} 為管理員`);
        console.log(`使用者 UID: ${user.uid}`);
    } catch (error) {
        console.error('建立或更新管理員失敗:', error.message);
        process.exit(1);
    }
}

createAdmin();
