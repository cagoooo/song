import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db, initializeDatabase } from "@db";
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
    // Test database connection with retries
    const MAX_RETRIES = 3;
    let retries = 0;
    let success = false;
    
    while (retries < MAX_RETRIES && !success) {
      try {
        retries++;
        log(`Initializing database (attempt ${retries}/${MAX_RETRIES})...`);
        await initializeDatabase();
        log('Database initialization successful');
        success = true;
      } catch (error) {
        log(`Database initialization failed on attempt ${retries}/${MAX_RETRIES}`);
        console.error(error);
        
        if (retries < MAX_RETRIES) {
          // Wait for a bit before retrying
          const waitTime = retries * 2000; // Increase wait time for each retry
          log(`Waiting ${waitTime/1000} seconds before retrying...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    if (!success) {
      log('All database initialization attempts failed. Exiting...');
      process.exit(1);
    }

    const server = registerRoutes(app);

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, '0.0.0.0', () => {
      log(`Server running on port ${PORT} (${app.get("env")})`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();