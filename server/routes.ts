import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, type IncomingMessage } from "ws";
import { db } from "@db";
import { songs, votes, users, type User } from "@db/schema";
import { setupAuth } from "./auth";
import { eq, sql } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    verifyClient: ({ req }: { req: IncomingMessage }) => {
      const protocol = req.headers['sec-websocket-protocol'];
      return protocol !== 'vite-hmr';
    }
  });

  // 設置認證系統
  setupAuth(app);

  // 特殊路由用於設置管理員密碼
  app.post("/api/admin/setup", async (req, res) => {
    try {
      const { username, password } = req.body;

      // 雜湊密碼
      const hashedPassword = await hashPassword(password);

      // 更新管理員密碼
      await db.update(users)
        .set({ password: hashedPassword })
        .where(eq(users.username, username));

      res.json({ message: "管理員帳號設置成功" });
    } catch (error) {
      console.error('Failed to setup admin:', error);
      res.status(500).json({ error: "設置管理員帳號失敗" });
    }
  });

  // 需要管理員權限的中間件
  const requireAdmin = (req: Request & { user?: User }, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ error: "需要管理員權限" });
    }
    next();
  };

  // REST API routes
  app.post("/api/songs", requireAdmin, async (req, res) => {
    try {
      const { title, artist, key, notes } = req.body;
      const [newSong] = await db.insert(songs).values({
        title,
        artist,
        key,
        notes,
        createdBy: req.user?.id,
        isActive: true
      }).returning();

      await sendSongsUpdate(wss);
      res.json(newSong);
    } catch (error) {
      console.error('Failed to add song:', error);
      res.status(500).json({ error: "新增歌曲失敗" });
    }
  });

  app.delete("/api/songs/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.update(songs)
        .set({ isActive: false })
        .where(eq(songs.id, id));

      await sendSongsUpdate(wss);
      res.json({ message: "歌曲已刪除" });
    } catch (error) {
      console.error('Failed to delete song:', error);
      res.status(500).json({ error: "刪除歌曲失敗" });
    }
  });

  app.get("/api/songs", async (_req, res) => {
    try {
      const songsList = await getSongsWithVotes();
      res.json(songsList);
    } catch (error) {
      console.error('Failed to fetch songs:', error);
      res.status(500).json({ error: "無法取得歌曲清單" });
    }
  });

  return httpServer;
}

async function getSongsWithVotes() {
  const allSongs = await db.select().from(songs).where(eq(songs.isActive, true));

  // 計算每首歌的投票數
  const songVotes = await db.select({
    songId: votes.songId,
    voteCount: sql<number>`count(*)`.mapWith(Number)
  })
  .from(votes)
  .groupBy(votes.songId);

  const voteMap = new Map(songVotes.map(v => [v.songId, v.voteCount]));

  return allSongs.map(song => ({
    ...song,
    voteCount: voteMap.get(song.id) || 0
  }));
}

async function sendSongsUpdate(wss: WebSocketServer) {
  try {
    const songsList = await getSongsWithVotes();
    wss.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(JSON.stringify({ 
          type: 'SONGS_UPDATE', 
          songs: songsList 
        }));
      }
    });
  } catch (error) {
    console.error('Failed to send songs update:', error);
  }
}