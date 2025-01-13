import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { db } from "@db";
import { songs, votes, tags, songTags, songSuggestions, qrCodeScans, type User, users } from "@db/schema";
import { setupAuth } from "./auth";
import { eq, sql, and } from "drizzle-orm";
import type { IncomingMessage } from "http";

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Auth middleware
  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ error: "需要管理員權限" });
    }
    next();
  };

  // Helper function to get songs with votes
  async function getSongsWithVotes() {
    try {
      const allSongs = await db
        .select()
        .from(songs)
        .where(eq(songs.isActive, true));

      const songVotes = await db
        .select({
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
    } catch (error) {
      console.error('Error fetching songs with votes:', error);
      throw error;
    }
  }

  // Helper function to broadcast songs update
  async function broadcastSongsUpdate(wss: WebSocketServer) {
    try {
      const songsList = await getSongsWithVotes();
      const message = JSON.stringify({
        type: 'SONGS_UPDATE',
        songs: songsList
      });

      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    } catch (error) {
      console.error('Failed to broadcast songs update:', error);
    }
  }

  // WebSocket server setup
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws',
    verifyClient: ({ req }: { req: IncomingMessage }) => {
      const protocol = req.headers['sec-websocket-protocol'];
      return protocol === 'vite-hmr' || true;
    }
  });

  wss.on('connection', function(ws) {
    const sessionId = Math.random().toString(36).substring(2);
    let isAlive = true;

    // Send initial songs data
    broadcastSongsUpdate(wss);

    // Set up ping interval
    const pingInterval = setInterval(() => {
      if (!isAlive) {
        ws.terminate();
        clearInterval(pingInterval);
        return;
      }

      isAlive = false;
      ws.ping();
    }, 30000);

    ws.on('pong', () => {
      isAlive = true;
    });

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG' }));
          return;
        }

        if (message.type === 'VOTE') {
          try {
            if (typeof message.songId !== 'number') {
              throw new Error('無效的歌曲ID');
            }

            const [song] = await db
              .select()
              .from(songs)
              .where(and(
                eq(songs.id, message.songId),
                eq(songs.isActive, true)
              ))
              .limit(1);

            if (!song) {
              throw new Error('找不到該歌曲或歌曲已被刪除');
            }

            await db.insert(votes).values({
              songId: message.songId,
              sessionId,
              createdAt: new Date()
            });

            await broadcastSongsUpdate(wss);

          } catch (error: any) {
            ws.send(JSON.stringify({
              type: 'ERROR',
              message: error.message || '處理點播請求時發生錯誤'
            }));
          }
        }
      } catch (error) {
        console.error('WebSocket message processing error:', error);
        ws.send(JSON.stringify({
          type: 'ERROR',
          message: '無法處理請求'
        }));
      }
    });

    ws.on('error', () => {
      clearInterval(pingInterval);
    });

    ws.on('close', () => {
      clearInterval(pingInterval);
    });
  });

  // API Routes
  app.get("/api/users/:username", async (req, res) => {
    try {
      const username = req.params.username;
      const user = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.username, username),
      });

      if (!user) {
        return res.status(404).json({ error: "找不到該使用者" });
      }

      res.json({
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin
      });
    } catch (error) {
      console.error('Failed to fetch user:', error);
      res.status(500).json({ error: "無法取得使用者資訊" });
    }
  });

  // Song Suggestions routes
  app.get("/api/suggestions", async (_req, res) => {
    try {
      const suggestions = await db.select().from(songSuggestions)
        .orderBy(sql`${songSuggestions.createdAt} DESC`);
      res.json(suggestions);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      res.status(500).json({ error: "無法取得歌曲建議列表" });
    }
  });

  app.post("/api/suggestions", async (req, res) => {
    try {
      const { title, artist, suggestedBy, notes } = req.body;

      // Input validation
      if (!title?.trim()) {
        return res.status(400).json({ error: "歌曲名稱不能為空" });
      }
      if (!artist?.trim()) {
        return res.status(400).json({ error: "歌手名稱不能為空" });
      }
      if (title.length > 100) {
        return res.status(400).json({ error: "歌曲名稱不能超過100個字符" });
      }
      if (artist.length > 100) {
        return res.status(400).json({ error: "歌手名稱不能超過100個字符" });
      }
      if (notes && notes.length > 500) {
        return res.status(400).json({ error: "備註不能超過500個字符" });
      }

      const [suggestion] = await db.insert(songSuggestions)
        .values({
          title: title.trim(),
          artist: artist.trim(),
          suggestedBy: suggestedBy?.trim() || null,
          notes: notes?.trim() || null,
          status: 'pending',
          createdAt: new Date()
        })
        .returning();

      res.json(suggestion);
    } catch (error: any) {
      console.error('Failed to create suggestion:', error);
      if (error.code === '23505') {
        res.status(409).json({
          error: "這首歌曲已經被建議過了",
          details: "請查看現有的建議列表"
        });
      } else {
        res.status(500).json({
          error: "無法新增歌曲建議",
          details: "請稍後再試，或聯繫管理員"
        });
      }
    }
  });

  app.patch("/api/suggestions/:id/status", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;

      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: "無效的狀態" });
      }

      const [updatedSuggestion] = await db.update(songSuggestions)
        .set({ status })
        .where(eq(songSuggestions.id, id))
        .returning();

      res.json(updatedSuggestion);
    } catch (error) {
      console.error('Failed to update suggestion status:', error);
      res.status(500).json({ error: "無法更新建議狀態" });
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

  app.patch("/api/songs/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { title, artist } = req.body;

      const [updatedSong] = await db
        .update(songs)
        .set({ title, artist })
        .where(eq(songs.id, id))
        .returning();

      await broadcastSongsUpdate(wss);
      res.json(updatedSong);
    } catch (error) {
      console.error('Failed to update song:', error);
      res.status(500).json({ error: "更新歌曲失敗" });
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

      await broadcastSongsUpdate(wss);
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

      await broadcastSongsUpdate(wss);
      res.json({ message: "歌曲已刪除" });
    } catch (error) {
      console.error('Failed to delete song:', error);
      res.status(500).json({ error: "刪除歌曲失敗" });
    }
  });

  app.post("/api/songs/reset-votes", requireAdmin, async (_req, res) => {
    try {
      await db.delete(votes);
      await broadcastSongsUpdate(wss);
      res.json({ message: "所有點播次數已重置" });
    } catch (error) {
      console.error('Failed to reset votes:', error);
      res.status(500).json({ error: "無法重置點播次數" });
    }
  });

  app.post("/api/qr-scans", async (req, res) => {
    try {
      const { songId } = req.body;
      const sessionId = req.sessionID || Math.random().toString(36).substring(2);
      const userAgent = req.headers['user-agent'];
      const referrer = req.headers.referer || req.headers.referrer;

      // Add type check for songId
      if (!songId || typeof songId !== 'number') {
        return res.status(400).json({ error: "Invalid songId" });
      }

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

      await broadcastSongsUpdate(wss);
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

      await broadcastSongsUpdate(wss);
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

      await broadcastSongsUpdate(wss);
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

      await broadcastSongsUpdate(wss);
      res.json({ message: "歌曲已刪除" });
    } catch (error) {
      console.error('Failed to delete song:', error);
      res.status(500).json({ error: "刪除歌曲失敗" });
    }
  });

  app.post("/api/songs/reset-votes", requireAdmin, async (_req, res) => {
    try {
      await db.delete(votes);
      await broadcastSongsUpdate(wss);
      res.json({ message: "所有點播次數已重置" });
    } catch (error) {
      console.error('Failed to reset votes:', error);
      res.status(500).json({ error: "無法重置點播次數" });
    }
  });

  return httpServer;
}