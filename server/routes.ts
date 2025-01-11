import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { db } from "@db";
import { songs, votes, songSuggestions, type User, type Song, type SongSuggestion } from "@db/schema";
import { setupAuth } from "./auth";
import { eq, sql } from "drizzle-orm";

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated() || !req.user?.isAdmin) {
    return res.status(403).json({ message: "需要管理員權限" });
  }
  next();
};

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Initialize Socket.IO with strict configuration
  const io = new SocketIOServer(httpServer, {
    path: '/ws',
    cors: {
      origin: true,
      methods: ["GET", "POST"],
      credentials: true
    },
    allowEIO3: true,
    transports: ['websocket', 'polling'],
    connectTimeout: 45000,
    maxHttpBufferSize: 1e6,
    pingTimeout: 30000,
    pingInterval: 25000,
    upgradeTimeout: 10000,
    serveClient: false,
  });

  // Socket.IO connection handler
  let activeConnections = 0;
  const connectedSockets = new Set<string>();

  io.on('connection', async (socket) => {
    try {
      const sessionId = Math.random().toString(36).substring(2);
      activeConnections++;
      connectedSockets.add(socket.id);

      console.log('Socket.IO connection established:', {
        id: socket.id,
        sessionId,
        activeConnections,
        transport: socket.conn.transport.name
      });

      // Send initial songs data
      try {
        const songsList = await getSongsWithVotes();
        socket.emit('songs_update', songsList);
      } catch (error) {
        console.error('Error in initial data sync:', error);
        socket.emit('error', { message: '無法載入歌曲列表' });
      }

      // Keep-alive mechanism
      const pingInterval = setInterval(() => {
        if (socket.connected) {
          socket.emit('ping');
        } else {
          clearInterval(pingInterval);
        }
      }, 25000);

      // Handle vote events
      socket.on('vote', async (songId: number) => {
        try {
          await db.insert(votes).values({
            songId,
            sessionId,
            createdAt: new Date()
          });

          const updatedSongs = await getSongsWithVotes();
          io.emit('songs_update', updatedSongs);
        } catch (error) {
          console.error('Vote processing error:', error);
          socket.emit('error', { message: '處理投票時發生錯誤' });
        }
      });

      // Handle client pong responses
      socket.on('pong', () => {
        console.log(`Received pong from client ${socket.id}`);
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        activeConnections--;
        connectedSockets.delete(socket.id);
        clearInterval(pingInterval);

        console.log('Socket.IO connection closed:', {
          id: socket.id,
          sessionId,
          reason,
          activeConnections,
          remainingConnections: Array.from(connectedSockets)
        });
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error('Socket.IO error:', error, { id: socket.id, sessionId });
      });

    } catch (error) {
      console.error('Connection setup error:', error);
      socket.disconnect(true);
    }
  });

  // Error handling for Socket.IO server
  io.engine.on('connection_error', (error) => {
    console.error('Socket.IO server error:', error);
  });

  // Setup HTTP routes
  app.get('/api/songs', async (_req, res) => {
    try {
      const songsList = await getSongsWithVotes();
      res.json(songsList);
    } catch (error) {
      console.error('Error fetching songs:', error);
      res.status(500).json({ message: '無法取得歌曲列表' });
    }
  });

  // 建議系統 API 路由
  // 取得所有建議
  app.get('/api/suggestions', async (_req, res) => {
    try {
      const suggestions = await db.select().from(songSuggestions)
        .orderBy(sql`${songSuggestions.createdAt} DESC`);
      res.json(suggestions);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      res.status(500).json({ message: '無法取得建議列表' });
    }
  });

  // 新增建議
  app.post('/api/suggestions', async (req, res) => {
    try {
      const { title, artist, suggestedBy, notes } = req.body;

      // 驗證必填欄位
      if (!title?.trim() || !artist?.trim()) {
        return res.status(400).json({ message: '歌曲名稱和歌手名稱為必填項目' });
      }

      // 檢查是否已存在相同建議
      const existingSuggestion = await db.select()
        .from(songSuggestions)
        .where(sql`LOWER(${songSuggestions.title}) = LOWER(${title.trim()}) 
                  AND LOWER(${songSuggestions.artist}) = LOWER(${artist.trim()})`);

      if (existingSuggestion.length > 0) {
        return res.status(409).json({ message: '此歌曲已經被建議過了' });
      }

      // 新增建議
      const [newSuggestion] = await db.insert(songSuggestions)
        .values({
          title: title.trim(),
          artist: artist.trim(),
          suggestedBy: suggestedBy?.trim() || null,
          notes: notes?.trim() || null,
          status: 'pending',
          createdAt: new Date()
        })
        .returning();

      res.status(201).json(newSuggestion);
    } catch (error) {
      console.error('Error adding suggestion:', error);
      res.status(500).json({ message: '無法新增建議，請稍後再試' });
    }
  });

  // 更新建議狀態（需要管理員權限）
  app.patch('/api/suggestions/:id/status', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: '無效的狀態值' });
      }

      const [updatedSuggestion] = await db.update(songSuggestions)
        .set({ status })
        .where(eq(songSuggestions.id, parseInt(id)))
        .returning();

      if (!updatedSuggestion) {
        return res.status(404).json({ message: '找不到此建議' });
      }

      res.json(updatedSuggestion);
    } catch (error) {
      console.error('Error updating suggestion status:', error);
      res.status(500).json({ message: '無法更新建議狀態' });
    }
  });

  // 刪除建議（需要管理員權限）
  app.delete('/api/suggestions/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      const [deletedSuggestion] = await db.delete(songSuggestions)
        .where(eq(songSuggestions.id, parseInt(id)))
        .returning();

      if (!deletedSuggestion) {
        return res.status(404).json({ message: '找不到此建議' });
      }

      res.json({ message: '建議已成功刪除' });
    } catch (error) {
      console.error('Error deleting suggestion:', error);
      res.status(500).json({ message: '無法刪除建議' });
    }
  });

  // Setup authentication
  setupAuth(app);

  return httpServer;
}

// Helper function for getting songs with votes
async function getSongsWithVotes(): Promise<Array<Song & { voteCount: number }>> {
  try {
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
  } catch (error) {
    console.error('Error fetching songs with votes:', error);
    throw error;
  }
}