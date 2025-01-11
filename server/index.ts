import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "@db";
import { sql } from "drizzle-orm";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Added error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

// Request logging middleware
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

(async () => {
  try {
    // Test database connection
    const result = await db.execute(sql`SELECT 1`);
    if (result) {
      log('Database connection successful');
    }

    const server = registerRoutes(app);

    // Setup Vite in development environment
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Server startup with error handling
    const PORT = 5000;
    const maxRetries = 3;
    let currentRetry = 0;
    let isListening = false;

    while (!isListening && currentRetry < maxRetries) {
      try {
        await new Promise<void>((resolve, reject) => {
          server.once('error', (error: NodeJS.ErrnoException) => {
            if (error.code === 'EADDRINUSE') {
              log(`Port ${PORT} is in use, attempt ${currentRetry + 1} of ${maxRetries}`);
              reject(new Error('Port in use'));
            } else {
              reject(error);
            }
          });

          server.once('listening', () => {
            isListening = true;
            log(`Server started on port ${PORT}`);
            resolve();
          });

          server.listen(PORT, "0.0.0.0");
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'Port in use') {
          currentRetry++;
          if (currentRetry < maxRetries) {
            log('Waiting before retry...');
            await new Promise(resolve => setTimeout(resolve, 1000 * currentRetry));
          }
        } else {
          throw error;
        }
      }
    }

    if (!isListening) {
      throw new Error(`Failed to start server after ${maxRetries} attempts`);
    }

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();