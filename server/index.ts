import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "@db";
import { sql } from "drizzle-orm";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

// Added error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

(async () => {
  try {
    // Test database connection
    log('Attempting database connection...');
    const result = await db.execute(sql`SELECT 1`);
    if (result) {
      log('Database connection successful');
    }

    const server = registerRoutes(app);
    if (!server) {
      throw new Error('Failed to register routes');
    }

    // Setup Vite in development environment
    if (app.get("env") === "development") {
      log('Setting up Vite for development...');
      await setupVite(app, server);
      log('Vite setup completed');
    } else {
      log('Production mode: Setting up static serving...');
      serveStatic(app);
    }

    // Start the server with a numeric port
    const PORT = 5000;
    server.listen(PORT, "0.0.0.0", () => {
      log(`Server running on port ${PORT}`);
      log(`Environment: ${app.get("env")}`);
      log(`Database URL: ${process.env.DATABASE_URL ? 'Set' : 'Not set'}`);
    });

  } catch (error) {
    console.error('Server startup error:', error);
    process.exit(1);
  }
})();