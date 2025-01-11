import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db, testConnection } from "@db";
import { sql } from "drizzle-orm";

const app = express();

// 啟動應用程式的主要函數
async function startServer() {
  try {
    // 基本中間件設置
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    // 請求記錄中間件
    app.use((req, res, next) => {
      const start = Date.now();
      const path = req.path;
      let capturedJsonResponse: Record<string, any> | undefined = undefined;

      const originalResJson = res.json;
      res.json = function (bodyJson, ...args) {
        capturedJsonResponse = bodyJson;
        return originalResJson.apply(res, [bodyJson, ...args]);
      };

      res.on("finish", () => {
        const duration = Date.now() - start;
        if (path.startsWith("/api")) {
          let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
          if (capturedJsonResponse) {
            logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
          }
          if (logLine.length > 80) {
            logLine = logLine.slice(0, 79) + "…";
          }
          log(logLine);
        }
      });

      next();
    });

    // 測試資料庫連接
    log('正在測試資料庫連接...');
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('無法連接到資料庫');
    }
    log('資料庫連接成功');

    // 註冊路由
    log('正在設置應用路由...');
    const server = registerRoutes(app);
    log('路由設置完成');

    // 錯誤處理中間件
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('應用錯誤:', err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "伺服器內部錯誤";
      res.status(status).json({ message });
    });

    // 在開發環境中設置 Vite
    if (app.get("env") === "development") {
      log('正在設置開發環境...');
      await setupVite(app, server);
      log('開發環境設置完成');
    } else {
      log('正在設置生產環境...');
      serveStatic(app);
      log('生產環境設置完成');
    }

    // 啟動伺服器
    const PORT = 5000;
    server.listen(PORT, "0.0.0.0", () => {
      log(`伺服器運行在端口 ${PORT}`);
      log(`環境: ${app.get("env")}`);
    });

  } catch (error) {
    console.error('伺服器啟動失敗:', error);
    process.exit(1);
  }
}

// 啟動應用程式
startServer().catch((error) => {
  console.error('無法啟動應用程式:', error);
  process.exit(1);
});