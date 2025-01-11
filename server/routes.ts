import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { db } from "@db";
import { songs, votes, songSuggestions } from "@db/schema";
import { setupAuth } from "./auth";
import { eq, sql } from "drizzle-orm";
import type { IncomingMessage } from "http";

// Express 請求處理器的類型定義
type RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => void;

const requireAdmin: RequestHandler = (req, res, next) => {
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
      const { title, artist, key, notes, lyrics, audioUrl } = req.body;
      const [newSong] = await db.insert(songs)
        .values({
          title,
          artist,
          key,
          notes,
          lyrics,
          audioUrl,
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

      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: "無效的狀態值" });
      }

      const [updatedSuggestion] = await db
        .update(songSuggestions)
        .set({ status })
        .where(eq(songSuggestions.id, id))
        .returning();

      if (!updatedSuggestion) {
        return res.status(404).json({ error: "找不到此建議" });
      }

      res.json(updatedSuggestion);
    } catch (error) {
      console.error('Failed to update suggestion status:', error);
      res.status(500).json({ error: "無法更新歌曲建議狀態" });
    }
  });

  // WebSocket message handling
  wss.on('connection', (ws) => {
    console.log('New WebSocket connection established');
    const sessionId = Math.random().toString(36).substring(2);
    let lastVoteTime: { [key: number]: number } = {};
    let voteCount: { [key: number]: number } = {};

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

          if (timeDiff > 50) {
            await db.insert(votes).values({
              songId: message.songId,
              sessionId: sessionId,
            });

            lastVoteTime[songId] = now;
            voteCount[songId] = (voteCount[songId] || 0) + 1;

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