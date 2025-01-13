import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { db } from "@db";
import { songs, votes, users } from "@db/schema";
import { setupAuth } from "./auth.js";
import { eq, sql, and } from "drizzle-orm";
import type { IncomingMessage } from "http";

export function registerRoutes(app: Express): Server {
  // Setup authentication first
  setupAuth(app);

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

    ws.onopen = () => {
      console.log('Client WebSocket connection opened');
    };

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
        console.log('Received message:', message);

        if (message.type === 'PING') {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'PONG' }));
          }
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

            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'VOTE_SUCCESS',
                songId: message.songId
              }));
            }

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

  // User routes
  app.get("/api/users/:username", async (req, res) => {
    try {
      const username = req.params.username;
      const [user] = await db
        .select({
          id: users.id,
          username: users.username,
          isAdmin: users.isAdmin,
        })
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: "找不到該使用者" });
      }

      res.json(user);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      res.status(500).json({ error: "無法取得使用者資訊" });
    }
  });

  return httpServer;
}