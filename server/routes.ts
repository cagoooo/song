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

  // Create WebSocket server with error handling
  const wss = new WebSocketServer({
    server: httpServer,
    path: '/ws',
    verifyClient: ({ req }: { req: IncomingMessage }) => {
      try {
        const protocol = req.headers['sec-websocket-protocol'];
        // Ignore vite-hmr connections
        if (protocol === 'vite-hmr') {
          return false;
        }
        return true;
      } catch (error) {
        console.error('Error in verifyClient:', error);
        return false;
      }
    },
    clientTracking: true,
  });

  // Heartbeat mechanism with proper type binding
  const heartbeat = function(this: WebSocketWithState) {
    this.isAlive = true;
  };

  // Heartbeat interval
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const client = ws as WebSocketWithState;
      if (!client.isAlive) {
        console.log('Terminating inactive WebSocket connection', {
          sessionId: client.sessionId
        });
        return client.terminate();
      }

      client.isAlive = false;
      try {
        client.ping();
      } catch (error) {
        console.error('Error sending ping:', error, {
          sessionId: client.sessionId
        });
        client.terminate();
      }
    });
  }, 30000);

  // Error handler for WebSocket server
  wss.on('error', (error) => {
    console.error('WebSocket server error:', error);
  });

  // Connection handler
  wss.on('connection', (ws, req) => {
    try {
      const client = ws as WebSocketWithState;
      client.sessionId = Math.random().toString(36).substring(2);
      client.isAlive = true;

      console.log('New WebSocket connection established', {
        ip: req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        sessionId: client.sessionId
      });

      // Bind heartbeat with correct this context
      client.on('pong', heartbeat.bind(client));

      let lastVoteTime: { [key: number]: number } = {};
      let voteCount: { [key: number]: number } = {};

      // Initial data sync with error handling
      (async () => {
        try {
          const songsList = await getSongsWithVotes();
          if (client.readyState === WebSocket.OPEN) {
            const message: SongsUpdateMessage = {
              type: 'SONGS_UPDATE',
              songs: songsList
            };
            client.send(JSON.stringify(message));
          }
        } catch (error) {
          console.error('Error sending initial songs:', error, {
            sessionId: client.sessionId
          });
          if (client.readyState === WebSocket.OPEN) {
            const errorMsg: ErrorMessage = {
              type: 'ERROR',
              message: '無法載入歌曲列表'
            };
            try {
              client.send(JSON.stringify(errorMsg));
            } catch (sendError) {
              console.error('Error sending error message:', sendError);
            }
          }
        }
      })();

      // Message handling with improved error recovery
      client.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString()) as WebSocketMessage;
          console.log('Received message:', message, { sessionId: client.sessionId });

          if (message.type === 'VOTE') {
            const now = Date.now();
            const songId = message.songId;
            const lastTime = lastVoteTime[songId] || 0;
            const timeDiff = now - lastTime;

            // Rate limiting
            if (timeDiff < 50) {
              console.log('Rate limited vote request', {
                sessionId: client.sessionId,
                songId,
                timeDiff
              });
              return;
            }

            if (client.readyState === WebSocket.OPEN) {
              try {
                await db.insert(votes).values({
                  songId,
                  sessionId: client.sessionId,
                  createdAt: new Date()
                });

                lastVoteTime[songId] = now;
                voteCount[songId] = (voteCount[songId] || 0) + 1;

                // Broadcast updated songs to all clients
                const updatedSongs = await getSongsWithVotes();
                const updateMsg: SongsUpdateMessage = {
                  type: 'SONGS_UPDATE',
                  songs: updatedSongs
                };

                wss.clients.forEach((ws) => {
                  const target = ws as WebSocketWithState;
                  if (target.readyState === WebSocket.OPEN) {
                    try {
                      target.send(JSON.stringify(updateMsg));
                    } catch (error) {
                      console.error('Error sending update to client:', error, {
                        targetSessionId: target.sessionId
                      });
                    }
                  }
                });
              } catch (error) {
                console.error('Error processing vote:', error, {
                  sessionId: client.sessionId,
                  songId
                });
                if (client.readyState === WebSocket.OPEN) {
                  const errorMsg: ErrorMessage = {
                    type: 'ERROR',
                    message: '處理投票時發生錯誤'
                  };
                  try {
                    client.send(JSON.stringify(errorMsg));
                  } catch (sendError) {
                    console.error('Error sending error message:', sendError);
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error('WebSocket message parsing error:', error, {
            sessionId: client.sessionId
          });
          if (client.readyState === WebSocket.OPEN) {
            try {
              const errorMsg: ErrorMessage = {
                type: 'ERROR',
                message: '無法處理訊息'
              };
              client.send(JSON.stringify(errorMsg));
            } catch (sendError) {
              console.error('Error sending error message:', sendError, {
                sessionId: client.sessionId
              });
            }
          }
        }
      });

      // Error handling with logging
      client.on('error', (error) => {
        console.error('WebSocket error:', error, {
          sessionId: client.sessionId,
          remoteAddress: req.socket.remoteAddress
        });
      });

      // Cleanup on close
      client.on('close', (code, reason) => {
        console.log('WebSocket connection closed', {
          code,
          reason: reason.toString(),
          sessionId: client.sessionId,
          remoteAddress: req.socket.remoteAddress
        });
        // Clean up resources
        lastVoteTime = {};
        voteCount = {};
      });

    } catch (error) {
      console.error('Error in WebSocket connection setup:', error);
      try {
        ws.terminate();
      } catch (terminateError) {
        console.error('Error terminating WebSocket:', terminateError);
      }
    }
  });

  // Cleanup interval on server close
  httpServer.on('close', () => {
    try {
      clearInterval(interval);
      wss.close();
    } catch (error) {
      console.error('Error closing WebSocket server:', error);
    }
  });

  setupAuth(app);
  return httpServer;
}

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