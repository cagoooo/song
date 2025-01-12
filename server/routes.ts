import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { sql } from "@db";

declare module 'express-serve-static-core' {
  interface Request {
    user?: any;
  }
}

const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "請先登入" });
  }
  if (!req.user?.is_admin) {
    return res.status(403).json({ message: "需要管理員權限" });
  }
  next();
};

// Helper function for getting songs with votes
async function getSongsWithVotes() {
  try {
    const songs = await sql`
      SELECT 
        s.*,
        COUNT(v.id) as vote_count
      FROM songs s
      LEFT JOIN votes v ON s.id = v.song_id
      WHERE s.is_active = true
      GROUP BY s.id
      ORDER BY vote_count DESC, s.created_at DESC
    `;

    return songs;
  } catch (error) {
    console.error('Error fetching songs with votes:', error);
    throw error;
  }
}

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: true,
      credentials: true
    }
  });

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

      // Check if song exists
      const [existingSong] = await sql`
        SELECT * FROM songs WHERE id = ${songId}
      `;

      if (!existingSong) {
        return res.status(404).json({ message: "找不到指定的歌曲" });
      }

      // Update song
      const [updatedSong] = await sql`
        UPDATE songs
        SET
          title = ${title.trim()},
          artist = ${artist.trim()},
          notes = ${notes?.trim() || null}
        WHERE id = ${songId}
        RETURNING *
      `;

      // 重新獲取所有歌曲數據並通知客戶端
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
  app.post('/api/songs/reset-votes', requireAdmin, async (_req, res) => {
    try {
      console.log('Starting vote reset process...');

      await sql`DELETE FROM votes`;
      console.log('Votes successfully deleted');

      const updatedSongs = await getSongsWithVotes();
      io.emit('songs_update', updatedSongs);
      console.log('Vote reset completed, notified all clients');

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

    // Handle vote events with improved error handling
    socket.on('vote', async (songId: number) => {
      try {
        console.log(`Processing vote for song ${songId} from session ${sessionId}`);

        await sql`
          INSERT INTO votes (song_id, session_id)
          VALUES (${songId}, ${sessionId})
        `;

        console.log(`Vote recorded for song ${songId}`);

        const updatedSongs = await getSongsWithVotes();
        io.emit('songs_update', updatedSongs);
        console.log('Vote processed successfully, clients notified');
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