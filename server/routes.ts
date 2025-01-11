import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { db } from "@db";
import { songs, votes, type User, type Song } from "@db/schema";
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

export function registerRoutes(app: Express): Server {
  // Create HTTP server first
  const httpServer = createServer(app);

  // Setup authentication before other routes
  setupAuth(app);

  // Setup Socket.IO after auth but before routes
  const io = new SocketIOServer(httpServer, {
    path: '/ws',
    cors: {
      origin: true,
      methods: ["GET", "POST"],
      credentials: true
    },
    allowEIO3: true,
    transports: ['websocket', 'polling']
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

  // 更新歌曲資訊
  app.patch('/api/songs/:id', requireAdmin, async (req, res) => {
    try {
      const songId = parseInt(req.params.id);
      const { title, artist, notes } = req.body;

      if (!songId || isNaN(songId)) {
        return res.status(400).json({ message: "無效的歌曲ID" });
      }

      const [existingSong] = await db
        .select()
        .from(songs)
        .where(eq(songs.id, songId))
        .limit(1);

      if (!existingSong) {
        return res.status(404).json({ message: "找不到指定的歌曲" });
      }

      await db
        .update(songs)
        .set({ title, artist, notes })
        .where(eq(songs.id, songId));

      const updatedSongs = await getSongsWithVotes();
      io.emit('songs_update', updatedSongs);

      res.json({ message: "歌曲更新成功" });
    } catch (error) {
      console.error('Error updating song:', error);
      res.status(500).json({ message: "更新歌曲失敗" });
    }
  });

  // 重置所有點播次數
  app.post('/api/songs/reset-votes', requireAdmin, async (_req, res) => {
    try {
      await db.delete(votes);

      const updatedSongs = await getSongsWithVotes();
      io.emit('songs_update', updatedSongs);

      res.json({ message: "點播次數已重置" });
    } catch (error) {
      console.error('Error resetting votes:', error);
      res.status(500).json({ message: "重置點播次數失敗" });
    }
  });

  // Setup Socket.IO connection handler
  io.on('connection', async (socket) => {
    try {
      const sessionId = Math.random().toString(36).substring(2);
      console.log('Socket.IO connection established:', {
        id: socket.id,
        sessionId
      });

      // Send initial songs data
      try {
        const songsList = await getSongsWithVotes();
        socket.emit('songs_update', songsList);
      } catch (error) {
        console.error('Error in initial data sync:', error);
        socket.emit('error', { message: '無法載入歌曲列表' });
      }

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

      socket.on('disconnect', (reason) => {
        console.log('Socket.IO connection closed:', {
          id: socket.id,
          sessionId,
          reason
        });
      });

      socket.on('error', (error) => {
        console.error('Socket.IO error:', error, {
          id: socket.id,
          sessionId
        });
      });

    } catch (error) {
      console.error('Connection setup error:', error);
      socket.disconnect(true);
    }
  });

  return httpServer;
}