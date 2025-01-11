import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { db } from "@db";
import { songs, votes, tags, songTags, songSuggestions, qrCodeScans, type User } from "@db/schema";
import { setupAuth } from "./auth";
import { eq, sql } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import type { IncomingMessage } from "http";

// Express 的 Request 類型擴展
declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

// 需要管理員權限的中間件
const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated() || !req.user?.isAdmin) {
    return res.status(403).json({ error: "需要管理員權限" });
  }
  next();
};

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

  // 設置檔案上傳的儲存位置和檔案名稱
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadDir = path.join(process.cwd(), 'uploads', 'audio');
      // 確保目錄存在
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      // 生成唯一的檔案名稱
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  });

  const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
      // 只允許上傳音訊檔案
      if (file.mimetype.startsWith('audio/')) {
        cb(null, true);
      } else {
        cb(new Error('只允許上傳音訊檔案'));
      }
    },
    limits: {
      fileSize: 10 * 1024 * 1024, // 限制檔案大小為 10MB
    }
  });

  // 處理音樂檔案上傳
  app.post('/api/upload/audio', requireAdmin, upload.single('audio'), (req, res) => {
    try {
      if (!req.file) {
        throw new Error('No file uploaded');
      }

      // 返回檔案的URL路徑
      const fileUrl = `/uploads/audio/${req.file.filename}`;
      res.json({ url: fileUrl });
    } catch (error) {
      console.error('Failed to upload audio file:', error);
      res.status(500).json({ error: '檔案上傳失敗' });
    }
  });

  // 提供靜態檔案存取
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));


  // QR Code scan tracking endpoints
  app.post("/api/qr-scans", async (req, res) => {
    try {
      const { songId } = req.body;
      const sessionId = req.sessionID || Math.random().toString(36).substring(2);
      const userAgent = req.headers['user-agent'] || null;
      const referrer = req.headers.referer || req.headers.referrer || null;

      const [scan] = await db
        .insert(qrCodeScans)
        .values({
          songId: Number(songId),
          sessionId: sessionId,
          userAgent: userAgent,
          referrer: referrer
        })
        .returning();

      res.json(scan);
    } catch (error) {
      console.error('Failed to record QR code scan:', error);
      res.status(500).json({ error: "無法記錄QR碼掃描" });
    }
  });

  // Get QR code scan statistics (admin only)
  app.get("/api/qr-scans/stats", requireAdmin, async (req, res) => {
    try {
      // Get total scans count
      const totalScans = await db
        .select({ count: sql<number>`count(*)`.mapWith(Number) })
        .from(qrCodeScans);

      // Get scans by song
      const scansBySong = await db
        .select({
          songId: songs.id,
          title: songs.title,
          artist: songs.artist,
          scanCount: sql<number>`count(${qrCodeScans.id})`.mapWith(Number)
        })
        .from(qrCodeScans)
        .innerJoin(songs, eq(qrCodeScans.songId, songs.id))
        .groupBy(songs.id, songs.title, songs.artist)
        .orderBy(sql`count(${qrCodeScans.id}) DESC`);

      // Get scans by date
      const scansByDate = await db
        .select({
          date: sql<string>`date_trunc('day', ${qrCodeScans.createdAt})::text`,
          count: sql<number>`count(*)`.mapWith(Number)
        })
        .from(qrCodeScans)
        .groupBy(sql`date_trunc('day', ${qrCodeScans.createdAt})`)
        .orderBy(sql`date_trunc('day', ${qrCodeScans.createdAt}) DESC`);

      res.json({
        totalScans: totalScans[0].count,
        scansBySong,
        scansByDate,
      });
    } catch (error) {
      console.error('Failed to fetch QR code scan statistics:', error);
      res.status(500).json({ error: "無法取得QR碼掃描統計" });
    }
  });

  // 標籤相關的 API 路由
  app.get("/api/tags", async (_req, res) => {
    try {
      const allTags = await db.select().from(tags);
      res.json(allTags);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
      res.status(500).json({ error: "無法取得標籤列表" });
    }
  });

  app.post("/api/tags", requireAdmin, async (req, res) => {
    try {
      const { name } = req.body;
      const [newTag] = await db.insert(tags)
        .values({ name })
        .returning();
      res.json(newTag);
    } catch (error) {
      console.error('Failed to create tag:', error);
      res.status(500).json({ error: "無法創建標籤" });
    }
  });

  app.get("/api/songs/:songId/tags", async (req, res) => {
    try {
      const songId = parseInt(req.params.songId);
      const songTagsList = await db
        .select({
          id: tags.id,
          name: tags.name
        })
        .from(songTags)
        .innerJoin(tags, eq(songTags.tagId, tags.id))
        .where(eq(songTags.songId, songId));
      res.json(songTagsList);
    } catch (error) {
      console.error('Failed to fetch song tags:', error);
      res.status(500).json({ error: "無法取得歌曲標籤" });
    }
  });

  app.post("/api/songs/:songId/tags", requireAdmin, async (req, res) => {
    try {
      const songId = parseInt(req.params.songId);
      const { tagId } = req.body;

      // 檢查標籤是否已經存在
      const existingTag = await db
        .select()
        .from(songTags)
        .where(sql`${songTags.songId} = ${songId} AND ${songTags.tagId} = ${tagId}`)
        .limit(1);

      if (existingTag.length > 0) {
        return res.status(400).json({ error: "標籤已存在" });
      }

      // 新增標籤關聯
      await db.insert(songTags)
        .values({ songId, tagId });

      await sendSongsUpdate(wss);
      res.json({ message: "標籤新增成功" });
    } catch (error) {
      console.error('Failed to add song tag:', error);
      res.status(500).json({ error: "無法新增歌曲標籤" });
    }
  });

  app.delete("/api/songs/:songId/tags/:tagId", requireAdmin, async (req, res) => {
    try {
      const songId = parseInt(req.params.songId);
      const tagId = parseInt(req.params.tagId);

      await db.delete(songTags)
        .where(sql`${songTags.songId} = ${songId} AND ${songTags.tagId} = ${tagId}`);

      await sendSongsUpdate(wss);
      res.json({ message: "標籤移除成功" });
    } catch (error) {
      console.error('Failed to remove song tag:', error);
      res.status(500).json({ error: "無法移除歌曲標籤" });
    }
  });

  // REST API routes
  app.post("/api/songs", requireAdmin, async (req, res) => {
    try {
      const { title, artist, key, notes, lyrics, audioUrl } = req.body;
      const [newSong] = await db.insert(songs).values({
        title,
        artist,
        key,
        notes,
        lyrics,
        audioUrl,
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

  // 批次匯入歌曲
  app.post("/api/songs/batch", requireAdmin, async (req, res) => {
    try {
      const { songs: songsList } = req.body;

      if (!Array.isArray(songsList)) {
        return res.status(400).json({ error: "無效的歌曲清單格式" });
      }

      // 批次插入所有歌曲
      await db.insert(songs).values(
        songsList.map(song => ({
          title: song.title,
          artist: song.artist,
          createdBy: req.user?.id,
          isActive: true
        }))
      );

      await sendSongsUpdate(wss);
      res.json({ message: `成功匯入 ${songsList.length} 首歌曲` });
    } catch (error) {
      console.error('Failed to batch import songs:', error);
      res.status(500).json({ error: "批次匯入失敗" });
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

  // 新增重置點播次數 API 路由
  app.post("/api/songs/reset-votes", requireAdmin, async (_req, res) => {
    try {
      await db.delete(votes);
      await sendSongsUpdate(wss);
      res.json({ message: "所有點播次數已重置" });
    } catch (error) {
      console.error('Failed to reset votes:', error);
      res.status(500).json({ error: "無法重置點播次數" });
    }
  });

  // 新增歌曲建議相關的路由
  app.post("/api/suggestions", async (req, res) => {
    try {
      const { title, artist, suggestedBy, notes } = req.body;

      const [newSuggestion] = await db.insert(songSuggestions)
        .values({
          title,
          artist,
          suggestedBy,
          notes,
          status: "pending"
        })
        .returning();

      res.json(newSuggestion);
    } catch (error) {
      console.error('Failed to add song suggestion:', error);
      res.status(500).json({ error: "無法新增歌曲建議" });
    }
  });

  app.get("/api/suggestions", async (_req, res) => {
    try {
      const suggestions = await db
        .select()
        .from(songSuggestions)
        .orderBy(sql`${songSuggestions.createdAt} DESC`);

      res.json(suggestions);
    } catch (error) {
      console.error('Failed to fetch song suggestions:', error);
      res.status(500).json({ error: "無法取得歌曲建議列表" });
    }
  });

  app.patch("/api/suggestions/:id/status", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;

      const [updatedSuggestion] = await db
        .update(songSuggestions)
        .set({ status })
        .where(eq(songSuggestions.id, id))
        .returning();

      res.json(updatedSuggestion);
    } catch (error) {
      console.error('Failed to update suggestion status:', error);
      res.status(500).json({ error: "無法更新歌曲建議狀態" });
    }
  });


  app.delete("/api/suggestions/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      await db.delete(songSuggestions)
        .where(eq(songSuggestions.id, id));

      res.json({ message: "建議已刪除" });
    } catch (error) {
      console.error('Failed to delete suggestion:', error);
      res.status(500).json({ error: "無法刪除建議" });
    }
  });

  // WebSocket message handling
  wss.on('connection', (ws) => {
    console.log('New WebSocket connection established');
    const sessionId = Math.random().toString(36).substring(2);
    sendSongsUpdate(wss);

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('Received message:', message);

        if (message.type === 'VOTE') {
          await db.insert(votes).values({
            songId: message.songId,
            sessionId
          });
          sendSongsUpdate(wss);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'ERROR',
          message: 'Failed to process message'
        }));
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
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