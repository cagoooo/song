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

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Initialize Socket.IO with CORS and path configuration
  const io = new SocketIOServer(httpServer, {
    path: '/ws',
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    transports: ['websocket'],
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 5000,
    maxHttpBufferSize: 1e6,
    serveClient: false,
  });

  // Handle WebSocket upgrade
  httpServer.on('upgrade', (request, socket, head) => {
    // Skip Vite HMR connections
    if (request.headers['sec-websocket-protocol']?.includes('vite-hmr')) {
      socket.destroy();
      return;
    }

    // Handle Socket.IO upgrades
    if (request.url?.startsWith('/ws')) {
      io.engine.handleUpgrade(request, socket as any, head);
    } else {
      socket.destroy();
    }
  });

  // Connection counter
  let activeConnections = 0;

  // Socket.IO connection handler
  io.on('connection', async (socket) => {
    try {
      // Skip vite-hmr connections
      if (socket.handshake.headers['sec-websocket-protocol']?.includes('vite-hmr')) {
        socket.disconnect();
        return;
      }

      // Generate session ID
      const sessionId = Math.random().toString(36).substring(2);
      activeConnections++;

      console.log('New Socket.IO connection established', {
        id: socket.id,
        sessionId,
        activeConnections,
        protocol: socket.handshake.headers['sec-websocket-protocol']
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

          // Broadcast updated songs to all clients
          const updatedSongs = await getSongsWithVotes();
          io.emit('songs_update', updatedSongs);
        } catch (error) {
          console.error('Vote processing error:', error);
          socket.emit('error', { message: '處理投票時發生錯誤' });
        }
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        activeConnections--;
        console.log('Socket.IO connection closed', {
          id: socket.id,
          sessionId,
          reason,
          activeConnections
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

  // Handle server errors
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