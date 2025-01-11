import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import WebSocket, { WebSocketServer } from "ws";
import { db } from "@db";
import { songs, votes, tags, songTags, songSuggestions, qrCodeScans, type User } from "@db/schema";
import { setupAuth } from "./auth";
import { eq, sql } from "drizzle-orm";

// Type declarations
declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

interface VoteMessage {
  type: 'VOTE';
  songId: number;
}

type WebSocketMessage = VoteMessage;

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
    path: '/ws'
  });

  setupAuth(app);

  // QR Code scan tracking endpoints
  app.post("/api/qr-scans", async (req: Request, res: Response) => {
    try {
      const { songId } = req.body;
      if (!songId || typeof songId !== 'number') {
        return res.status(400).json({ error: "需要提供有效的 songId" });
      }

      const [scan] = await db.insert(qrCodeScans)
        .values({
          songId,
          sessionId: req.sessionID || Math.random().toString(36).substring(2),
          userAgent: req.headers['user-agent'] || null,
          referrer: req.headers.referer || null
        })
        .returning();

      res.json(scan);
    } catch (error) {
      console.error('Failed to record QR code scan:', error);
      res.status(500).json({ error: "無法記錄QR碼掃描" });
    }
  });

  // Get QR code scan statistics (admin only)
  app.get("/api/qr-scans/stats", requireAdmin, async (_req: Request, res: Response) => {
    try {
      const totalScans = await db
        .select({ count: sql<number>`count(*)` })
        .from(qrCodeScans);

      const scansBySong = await db
        .select({
          songId: songs.id,
          title: songs.title,
          artist: songs.artist,
          scanCount: sql<number>`count(${qrCodeScans.id})`
        })
        .from(qrCodeScans)
        .innerJoin(songs, eq(qrCodeScans.songId, songs.id))
        .groupBy(songs.id, songs.title, songs.artist)
        .orderBy(sql`count(${qrCodeScans.id}) DESC`);

      const scansByDate = await db
        .select({
          date: sql<string>`date_trunc('day', ${qrCodeScans.createdAt})::text`,
          count: sql<number>`count(*)`
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

  // Tags related endpoints
  app.get("/api/tags", async (_req: Request, res: Response) => {
    try {
      const allTags = await db.select().from(tags);
      res.json(allTags);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
      res.status(500).json({ error: "無法取得標籤列表" });
    }
  });

  app.post("/api/tags", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { name } = req.body;
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: "需要提供有效的標籤名稱" });
      }

      const [newTag] = await db.insert(tags)
        .values({ name })
        .returning();

      res.json(newTag);
    } catch (error) {
      console.error('Failed to create tag:', error);
      res.status(500).json({ error: "無法創建標籤" });
    }
  });

  app.get("/api/songs/:songId/tags", async (req: Request, res: Response) => {
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

  app.post("/api/songs/:songId/tags", requireAdmin, async (req: Request, res: Response) => {
    try {
      const songId = parseInt(req.params.songId);
      const { tagId } = req.body;
      if (!tagId || typeof tagId !== 'number') {
        return res.status(400).json({ error: "需要提供有效的標籤ID" });
      }

      const existingTag = await db
        .select()
        .from(songTags)
        .where(sql`${songTags.songId} = ${songId} AND ${songTags.tagId} = ${tagId}`)
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

  app.delete("/api/songs/:songId/tags/:tagId", requireAdmin, async (req: Request, res: Response) => {
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

  // Songs related endpoints
  app.post("/api/songs", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { title, artist, key, notes } = req.body;
      if (!title || !artist || typeof title !== 'string' || typeof artist !== 'string') {
        return res.status(400).json({ error: "需要提供有效的歌曲資訊" });
      }

      const [newSong] = await db.insert(songs)
        .values({
          title,
          artist,
          key: key || null,
          notes: notes || null,
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

  app.get("/api/songs", async (_req: Request, res: Response) => {
    try {
      const songsList = await getSongsWithVotes();
      res.json(songsList);
    } catch (error) {
      console.error('Failed to fetch songs:', error);
      res.status(500).json({ error: "無法取得歌曲清單" });
    }
  });

  app.get("/api/suggestions", async (_req: Request, res: Response) => {
    try {
      const suggestions = await db.select().from(songSuggestions);
      res.json(suggestions);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      res.status(500).json({ error: "無法取得建議列表" });
    }
  });

  app.post("/api/suggestions", async (req: Request, res: Response) => {
    try {
      const { title, artist, suggestedBy, notes } = req.body;
      if (!title || !artist || typeof title !== 'string' || typeof artist !== 'string') {
        return res.status(400).json({ error: "需要提供有效的歌曲資訊" });
      }

      const [newSuggestion] = await db.insert(songSuggestions)
        .values({
          title,
          artist,
          suggestedBy: suggestedBy || null,
          notes: notes || null,
          status: "pending"
        })
        .returning();

      res.json(newSuggestion);
    } catch (error) {
      console.error('Failed to create suggestion:', error);
      res.status(500).json({ error: "無法建立建議" });
    }
  });

  // WebSocket vote handling
  wss.on('connection', (ws: WebSocket) => {
    console.log('New WebSocket connection established');
    const sessionId = Math.random().toString(36).substring(2);
    let lastVoteTime: Record<number, number> = {};

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as WebSocketMessage;

        if (message.type === 'VOTE' && typeof message.songId === 'number') {
          const now = Date.now();
          const songId = message.songId;
          const lastTime = lastVoteTime[songId] || 0;
          const timeDiff = now - lastTime;

          if (timeDiff > 50) {
            await db.insert(votes)
              .values({
                songId,
                sessionId
              });

            lastVoteTime[songId] = now;
            await sendSongsUpdate(wss);
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'ERROR',
          message: '處理訊息時發生錯誤'
        }));
      }
    });

    ws.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
      lastVoteTime = {};
    });

    // Send initial songs data
    sendSongsUpdate(wss).catch(error => {
      console.error('Failed to send initial songs data:', error);
    });
  });

  return httpServer;
}

async function getSongsWithVotes() {
  const allSongs = await db.select().from(songs).where(eq(songs.isActive, true));
  const songVotes = await db
    .select({
      songId: votes.songId,
      voteCount: sql<number>`count(*)`
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
    const data = JSON.stringify({
      type: 'SONGS_UPDATE',
      songs: songsList
    });

    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  } catch (error) {
    console.error('Failed to send songs update:', error);
  }
}