import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { db } from "@db";
import { songs, votes, tags, songTags, songSuggestions, qrCodeScans, type User } from "@db/schema";
import { setupAuth } from "./auth";
import { eq, sql } from "drizzle-orm";
import type { IncomingMessage } from "http";

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

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

  setupAuth(app);

  // QR Code scan tracking endpoints
  app.post("/api/qr-scans", async (req, res) => {
    try {
      const { songId } = req.body;
      const sessionId = req.sessionID || Math.random().toString(36).substring(2);
      const userAgent = req.headers['user-agent'];
      const referrer = req.headers.referer || req.headers.referrer;

      const [scan] = await db.insert(qrCodeScans)
        .values({
          song_id: songId,  // 修改 songId 為 song_id 以符合資料庫 schema
          session_id: sessionId,  // 修改 sessionId 為 session_id 以符合資料庫 schema
          user_agent: userAgent || null,  // 修改 userAgent 為 user_agent 以符合資料庫 schema
          referrer: referrer || null,
          created_at: new Date()  // 新增 created_at 欄位
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

  // Add new route for updating song information
  app.patch("/api/songs/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { title, artist, notes } = req.body;

      // 更新歌曲資訊
      const [updatedSong] = await db.update(songs)
        .set({
          title: title || undefined,
          artist: artist || undefined,
          notes: notes || undefined,
        })
        .where(eq(songs.id, id))
        .returning();

      if (!updatedSong) {
        return res.status(404).json({ error: "找不到歌曲" });
      }

      // 通知所有客戶端歌曲資訊已更新
      await sendSongsUpdate(wss);
      res.json(updatedSong);
    } catch (error) {
      console.error('Failed to update song:', error);
      res.status(500).json({ error: "更新歌曲失敗" });
    }
  });

  // WebSocket message handling
  wss.on('connection', (ws) => {
    console.log('New WebSocket connection established');
    const sessionId = Math.random().toString(36).substring(2);
    let lastVoteTime: { [key: number]: number } = {};
    let voteCount: { [key: number]: number } = {};

    // Send initial songs data
    sendSongsUpdate(wss);

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('Received message:', message);

        if (message.type === 'VOTE') {
          const now = Date.now();
          const songId = message.songId;
          const lastTime = lastVoteTime[songId] || 0;
          const timeDiff = now - lastTime;

          // Reduced minimum time between votes from 100ms to 50ms
          if (timeDiff > 50) {
            await db.insert(votes).values({
              songId: message.songId,
              sessionId: sessionId,
              createdAt: new Date()
            });

            // Update vote tracking
            lastVoteTime[songId] = now;
            voteCount[songId] = (voteCount[songId] || 0) + 1;

            // Send immediate update
            sendSongsUpdate(wss);
          }
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

    // Clean up on connection close
    ws.on('close', () => {
      console.log('WebSocket connection closed');
      lastVoteTime = {};
      voteCount = {};
    });
  });

  return httpServer;
}

async function getSongsWithVotes() {
  const allSongs = await db.select().from(songs).where(eq(songs.isActive, true));

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