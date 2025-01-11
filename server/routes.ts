import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { db } from "@db";
import { songs, votes, type User, type Song } from "@db/schema";
import { setupAuth } from "./auth";
import { eq, sql } from "drizzle-orm";
import type { IncomingMessage } from "http";

// Define WebSocket message types
interface VoteMessage {
  type: 'VOTE';
  songId: number;
}

interface ErrorMessage {
  type: 'ERROR';
  message: string;
}

interface SongsUpdateMessage {
  type: 'SONGS_UPDATE';
  songs: Array<Song & { voteCount: number }>;
}

type WebSocketMessage = VoteMessage | ErrorMessage | SongsUpdateMessage;

interface WebSocketWithState extends WebSocket {
  isAlive: boolean;
  sessionId: string;
}

interface ExtendedIncomingMessage extends IncomingMessage {
  headers: {
    'sec-websocket-protocol'?: string;
    'sec-websocket-key'?: string;
    'sec-websocket-version'?: string;
    upgrade?: string;
    connection?: string;
    origin?: string;
  };
}

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

  // WebSocket server configuration
  const wss = new WebSocketServer({
    noServer: true, // Important: Use noServer mode for better control
    clientTracking: true,
  });

  // Handle WebSocket upgrade requests
  httpServer.on('upgrade', (request: ExtendedIncomingMessage, socket, head) => {
    try {
      // Ignore vite-hmr requests
      if (request.headers['sec-websocket-protocol']?.includes('vite-hmr') ||
          request.headers.origin?.includes('vite')) {
        socket.destroy();
        return;
      }

      // Validate WebSocket connection
      if (!request.headers.upgrade?.toLowerCase().includes('websocket') ||
          !request.headers.connection?.toLowerCase().includes('upgrade') ||
          !request.headers['sec-websocket-key'] ||
          !request.headers['sec-websocket-version']) {
        socket.destroy();
        return;
      }

      // Handle WebSocket path
      const url = new URL(request.url || '', `http://${request.headers.host}`);
      if (url.pathname !== '/ws') {
        socket.destroy();
        return;
      }

      // Upgrade the connection
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } catch (error) {
      console.error('Error in upgrade handling:', error);
      socket.destroy();
    }
  });

  // Connection tracker
  let activeConnections = 0;

  // Heartbeat mechanism
  const heartbeat = function(this: WebSocketWithState) {
    this.isAlive = true;
  };

  // Connection cleanup interval
  const cleanupInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const client = ws as WebSocketWithState;
      if (!client.isAlive) {
        console.log('Terminating inactive client:', client.sessionId);
        return client.terminate();
      }
      client.isAlive = false;
      client.ping();
    });
  }, 30000);

  // WebSocket connection handler
  wss.on('connection', async (ws: WebSocket, request: IncomingMessage) => {
    try {
      const client = ws as WebSocketWithState;
      client.sessionId = Math.random().toString(36).substring(2);
      client.isAlive = true;
      activeConnections++;

      console.log('New WebSocket connection established', {
        ip: request.socket.remoteAddress,
        userAgent: request.headers['user-agent'],
        sessionId: client.sessionId,
        activeConnections
      });

      // Setup heartbeat
      client.on('pong', heartbeat.bind(client));

      // Initial data sync
      try {
        const songsList = await getSongsWithVotes();
        const message: SongsUpdateMessage = {
          type: 'SONGS_UPDATE',
          songs: songsList
        };
        client.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error in initial data sync:', error);
        const errorMsg: ErrorMessage = {
          type: 'ERROR',
          message: '無法載入歌曲列表'
        };
        client.send(JSON.stringify(errorMsg));
      }

      // Message handler
      client.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString()) as WebSocketMessage;

          if (message.type === 'VOTE') {
            try {
              await db.insert(votes).values({
                songId: message.songId,
                sessionId: client.sessionId,
                createdAt: new Date()
              });

              // Broadcast update to all clients
              const updatedSongs = await getSongsWithVotes();
              const updateMsg: SongsUpdateMessage = {
                type: 'SONGS_UPDATE',
                songs: updatedSongs
              };

              const broadcastData = JSON.stringify(updateMsg);
              wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(broadcastData);
                }
              });
            } catch (error) {
              console.error('Vote processing error:', error);
              const errorMsg: ErrorMessage = {
                type: 'ERROR',
                message: '處理投票時發生錯誤'
              };
              client.send(JSON.stringify(errorMsg));
            }
          }
        } catch (error) {
          console.error('Message parsing error:', error);
          const errorMsg: ErrorMessage = {
            type: 'ERROR',
            message: '訊息格式錯誤'
          };
          client.send(JSON.stringify(errorMsg));
        }
      });

      // Error handler
      client.on('error', (error) => {
        console.error('WebSocket client error:', error, { sessionId: client.sessionId });
      });

      // Close handler
      client.on('close', () => {
        activeConnections--;
        client.isAlive = false;
        console.log('WebSocket connection closed', {
          sessionId: client.sessionId,
          activeConnections
        });
      });

    } catch (error) {
      console.error('Connection setup error:', error);
      ws.terminate();
    }
  });

  // Server shutdown cleanup
  httpServer.on('close', () => {
    clearInterval(cleanupInterval);
    wss.close();
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