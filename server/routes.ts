import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { db } from "@db";
import { songs, votes } from "@db/schema";
import { setupAuth } from "./auth";
import { eq, sql } from "drizzle-orm";

// 需要管理員權限的中間件
const requireAdmin = (req: Request & { user?: Express.User }, res: Response, next: NextFunction) => {
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
    verifyClient: ({ req }) => {
      const protocol = req.headers['sec-websocket-protocol'];
      return protocol !== 'vite-hmr';
    }
  });

  // 設置認證系統
  setupAuth(app);

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