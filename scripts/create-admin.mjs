// 建立管理員帳號腳本
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// 從環境變數或服務帳號金鑰初始化
// 如果已經用 firebase login 登入，可以使用 applicationDefault
initializeApp({
    projectId: 'guitar-ff931',
});

const auth = getAuth();
const db = getFirestore();

async function createAdmin() {
    const email = 'cagooo@gmail.com';
    const password = process.argv[2]; // 從命令列取得密碼

    if (!password) {
        console.error('❌ 請提供密碼作為參數：node scripts/create-admin.mjs <password>');
        process.exit(1);
    }

    try {
        // 嘗試取得現有使用者
        let user;
        try {
            user = await auth.getUserByEmail(email);
            console.log(`📧 找到現有使用者: ${user.uid}`);
        } catch (e) {
            // 使用者不存在，建立新的
            user = await auth.createUser({
                email,
                password,
                displayName: 'Admin',
            });
            console.log(`✅ 建立新使用者: ${user.uid}`);
        }

        // 在 Firestore 設定管理員權限
        await db.collection('users').doc(user.uid).set({
            email: user.email,
            isAdmin: true,
            createdAt: new Date(),
        }, { merge: true });

        console.log(`🔑 已設定 ${email} 為管理員`);
        console.log(`\n📋 使用者 UID: ${user.uid}`);

    } catch (error) {
        console.error('❌ 錯誤:', error.message);
        process.exit(1);
    }
}

createAdmin();
