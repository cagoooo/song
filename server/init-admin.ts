import { db } from "@db";
import { users } from "@db/schema";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function initAdmin() {
  try {
    // 檢查是否已經存在管理員帳號
    const adminExists = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, "cagoo"),
    });

    if (!adminExists) {
      // 建立管理員密碼的雜湊值
      const hashedPassword = await hashPassword("smes1234");

      // 建立管理員帳號
      const [newAdmin] = await db
        .insert(users)
        .values({
          username: "cagoo",
          password: hashedPassword,
          isAdmin: true,
        })
        .returning();

      console.log("管理員帳號建立成功:", newAdmin.username);
    } else {
      console.log("管理員帳號已存在");
    }
  } catch (error) {
    console.error("建立管理員帳號時發生錯誤:", error);
    process.exit(1);
  }
}

// 執行初始化
await initAdmin();
process.exit(0);