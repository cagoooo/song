import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { db } from "@db";
import { songs, votes, tags, songTags, songSuggestions, qrCodeScans, type User } from "@db/schema";
import { setupAuth } from "./auth";
import { eq, sql, and } from "drizzle-orm";
import type { IncomingMessage } from "http";

// Type declaration for Express Request
declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
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
      if (client.readyState === 1) {
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

  // Auth middleware
  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ error: "需要管理員權限" });
    }
    next();
  };

  setupAuth(app);

  // Add the PATCH endpoint for updating songs
  app.patch("/api/songs/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { title, artist } = req.body;

      const [updatedSong] = await db
        .update(songs)
        .set({ title, artist })
        .where(eq(songs.id, id))
        .returning();

      await sendSongsUpdate(wss);
      res.json(updatedSong);
    } catch (error) {
      console.error('Failed to update song:', error);
      res.status(500).json({ error: "更新歌曲失敗" });
    }
  });

  // QR Code scan tracking endpoints
  app.post("/api/qr-scans", async (req, res) => {
    try {
      const { songId } = req.body;
      const sessionId = req.sessionID || Math.random().toString(36).substring(2);
      const userAgent = req.headers['user-agent'];
      const referrer = req.headers.referer || req.headers.referrer;

      const [scan] = await db.insert(qrCodeScans)
        .values({
          songId,
          sessionId,
          userAgent: userAgent || null,
          referrer: referrer || null,
          createdAt: new Date()
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

  // Songs routes
  app.get("/api/songs", async (_req, res) => {
    try {
      const songsList = await getSongsWithVotes();
      res.json(songsList);
    } catch (error) {
      console.error('Failed to fetch songs:', error);
      res.status(500).json({ error: "無法取得歌曲清單" });
    }
  });

  app.post("/api/songs", requireAdmin, async (req, res) => {
    try {
      const { title, artist } = req.body;
      const [newSong] = await db.insert(songs)
        .values({
          title,
          artist,
          createdBy: req.user?.id,
          isActive: true
        })
        .returning();

      await sendSongsUpdate(wss);
      res.json(newSong);
    } catch (error) {
      console.error('Failed to add song:', error);
      res.status(500).json({ error: "新增歌曲失敗" });
    }
  });

  // WebSocket handling
  wss.on('connection', (ws) => {
    console.log('New WebSocket connection established');
    const sessionId = Math.random().toString(36).substring(2);

    // Send initial songs data
    sendSongsUpdate(wss);

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('Received message:', message);

        if (message.type === 'VOTE') {
          await db.insert(votes).values({
            songId: message.songId,
            sessionId,
            createdAt: new Date()
          });

          await sendSongsUpdate(wss);
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

    ws.on('close', () => {
      console.log('WebSocket connection closed');
    });
  });

  // Tags routes
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

      const existingTag = await db
        .select()
        .from(songTags)
        .where(
          and(
            eq(songTags.songId, songId),
            eq(songTags.tagId, tagId)
          )
        )
        .limit(1);

      if (existingTag.length > 0) {
        return res.status(400).json({ error: "標籤已存在" });
      }

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
        .where(
          and(
            eq(songTags.songId, songId),
            eq(songTags.tagId, tagId)
          )
        );

      await sendSongsUpdate(wss);
      res.json({ message: "標籤移除成功" });
    } catch (error) {
      console.error('Failed to remove song tag:', error);
      res.status(500).json({ error: "無法移除歌曲標籤" });
    }
  });

  app.post("/api/songs/batch", requireAdmin, async (req, res) => {
    try {
      const { songs: songsList } = req.body;

      if (!Array.isArray(songsList)) {
        return res.status(400).json({ error: "無效的歌曲清單格式" });
      }

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

  return httpServer;
}