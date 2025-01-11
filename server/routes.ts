import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { db, sql } from "@db";
import { songs, votes, type User, type Song } from "@db/schema";
import { setupAuth } from "./auth";
import { eq } from "drizzle-orm";

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "請先登入" });
  }
  if (!req.user?.isAdmin) {
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
  // Create HTTP server
  const httpServer = createServer(app);

  // Setup Socket.IO with minimal configuration
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: true,
      credentials: true
    }
  });

  // Setup authentication
  setupAuth(app);

  // Get all songs
  app.get('/api/songs', async (_req, res) => {
    try {
      const songsList = await getSongsWithVotes();
      res.json(songsList);
    } catch (error) {
      console.error('Error fetching songs:', error);
      res.status(500).json({ message: '無法取得歌曲列表' });
    }
  });

  // Update song information
  app.patch('/api/songs/:id', requireAdmin, async (req, res) => {
    try {
      const songId = parseInt(req.params.id);
      const { title, artist, notes } = req.body;

      if (!songId || isNaN(songId)) {
        return res.status(400).json({ message: "無效的歌曲ID" });
      }

      if (!title?.trim() || !artist?.trim()) {
        return res.status(400).json({ message: "歌名和歌手名稱不能為空" });
      }

      const [existingSong] = await db
        .select()
        .from(songs)
        .where(eq(songs.id, songId))
        .limit(1);

      if (!existingSong) {
        return res.status(404).json({ message: "找不到指定的歌曲" });
      }

      const [updatedSong] = await db
        .update(songs)
        .set({ 
          title: title.trim(), 
          artist: artist.trim(), 
          notes: notes?.trim() || null 
        })
        .where(eq(songs.id, songId))
        .returning();

      const updatedSongs = await getSongsWithVotes();
      io.emit('songs_update', updatedSongs);

      res.json({ 
        message: "歌曲更新成功",
        song: updatedSong
      });
    } catch (error) {
      console.error('Error updating song:', error);
      res.status(500).json({ message: "更新歌曲失敗" });
    }
  });

  // Reset all vote counts
  app.post('/api/songs/reset-votes', requireAdmin, async (req, res) => {
    try {
      await db.delete(votes).execute();
      const updatedSongs = await getSongsWithVotes();
      io.emit('songs_update', updatedSongs);
      res.json({ message: "點播次數已重置" });
    } catch (error) {
      console.error('Error resetting votes:', error);
      res.status(500).json({ message: "重置點播次數失敗" });
    }
  });

  // Socket.IO connection handler
  io.on('connection', (socket) => {
    const sessionId = Math.random().toString(36).substring(2);
    console.log('Socket connected:', socket.id);

    // Send initial songs data
    getSongsWithVotes()
      .then(songsList => {
        socket.emit('songs_update', songsList);
      })
      .catch(error => {
        console.error('Error in initial data sync:', error);
        socket.emit('error', { message: '無法載入歌曲列表' });
      });

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

    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  return httpServer;
}