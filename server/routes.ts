import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { db } from "@db";
import { songs, votes } from "@db/schema";
import { setupAuth } from "./auth";
import { eq, sql, and } from "drizzle-orm";
import type { IncomingMessage } from "http";

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);
  setupAuth(app);

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
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'SONGS_UPDATE',
            songs: songsList
          }));
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
      // Always allow Vite HMR connections
      if (protocol === 'vite-hmr') {
        return true;
      }
      // For our application WebSocket connections
      return true;
    }
  });

  wss.on('connection', function(ws) {
    console.log('New WebSocket connection established');
    const sessionId = Math.random().toString(36).substring(2);
    let isAlive = true;

    // Send initial songs data
    broadcastSongsUpdate(wss).catch(console.error);

    const pingInterval = setInterval(() => {
      if (!isAlive) {
        clearInterval(pingInterval);
        ws.terminate();
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

            ws.send(JSON.stringify({
              type: 'VOTE_SUCCESS',
              songId: message.songId
            }));

          } catch (error: any) {
            console.error('Vote handling error:', error);
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'ERROR',
                message: error.message || '處理點播請求時發生錯誤'
              }));
            }
          }
        }
      } catch (error) {
        console.error('Message processing error:', error);
      }
    });

    ws.on('close', () => {
      clearInterval(pingInterval);
      console.log('WebSocket connection closed');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clearInterval(pingInterval);
    });
  });

  // API Routes
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