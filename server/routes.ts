import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { db } from "@db";
import { songs, votes, tags, songTags, songSuggestions, qrCodeScans, type User, type Song } from "@db/schema";
import { setupAuth } from "./auth";
import { eq, sql } from "drizzle-orm";
import type { IncomingMessage } from "http";

// Define WebSocket message types
type VoteMessage = {
  type: 'VOTE';
  songId: number;
};

type ErrorMessage = {
  type: 'ERROR';
  message: string;
};

type SongsUpdateMessage = {
  type: 'SONGS_UPDATE';
  songs: (Song & { voteCount: number })[];
};

type WebSocketMessage = VoteMessage | ErrorMessage | SongsUpdateMessage;

type WebSocketWithState = WebSocket & {
  isAlive?: boolean;
};

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
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
      if (protocol === 'vite-hmr') {
        return false;
      }
      return true;
    },
    clientTracking: true,
  });

  function heartbeat(this: WebSocketWithState) {
    this.isAlive = true;
  }

  const interval = setInterval(() => {
    (wss.clients as Set<WebSocketWithState>).forEach((ws) => {
      if (ws.isAlive === false) {
        console.log('Terminating inactive WebSocket connection');
        return ws.terminate();
      }

      ws.isAlive = false;
      try {
        ws.ping();
      } catch (error) {
        console.error('Error sending ping:', error);
        ws.terminate();
      }
    });
  }, 30000);

  wss.on('connection', (ws: WebSocketWithState, req) => {
    console.log('New WebSocket connection established', {
      ip: req.socket.remoteAddress,
      userAgent: req.headers['user-agent']
    });

    ws.isAlive = true;
    ws.on('pong', heartbeat);

    const sessionId = Math.random().toString(36).substring(2);
    let lastVoteTime: { [key: number]: number } = {};
    let voteCount: { [key: number]: number } = {};

    try {
      sendSongsUpdate(wss).catch(error => {
        console.error('Error sending initial songs update:', error);
      });
    } catch (error) {
      console.error('Error in initial songs update:', error);
    }

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString()) as WebSocketMessage;
        console.log('Received message:', message);

        if (message.type === 'VOTE') {
          const now = Date.now();
          const songId = message.songId;
          const lastTime = lastVoteTime[songId] || 0;
          const timeDiff = now - lastTime;

          if (timeDiff > 50) {
            try {
              await db.insert(votes).values({
                songId: songId,
                sessionId,
                createdAt: new Date()
              });

              lastVoteTime[songId] = now;
              voteCount[songId] = (voteCount[songId] || 0) + 1;

              try {
                await sendSongsUpdate(wss);
              } catch (error) {
                console.error('Error sending songs update after vote:', error);
                const errorMsg: ErrorMessage = {
                  type: 'ERROR',
                  message: '更新歌曲列表時發生錯誤'
                };
                ws.send(JSON.stringify(errorMsg));
              }
            } catch (error) {
              console.error('Error processing vote:', error);
              const errorMsg: ErrorMessage = {
                type: 'ERROR',
                message: '處理投票時發生錯誤'
              };
              ws.send(JSON.stringify(errorMsg));
            }
          }
        }
      } catch (error) {
        console.error('WebSocket message parsing error:', error);
        try {
          const errorMsg: ErrorMessage = {
            type: 'ERROR',
            message: '無法處理訊息'
          };
          ws.send(JSON.stringify(errorMsg));
        } catch (sendError) {
          console.error('Error sending error message:', sendError);
        }
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error, {
        sessionId,
        remoteAddress: req.socket.remoteAddress
      });
    });

    ws.on('close', (code, reason) => {
      console.log('WebSocket connection closed', {
        code,
        reason: reason.toString(),
        sessionId,
        remoteAddress: req.socket.remoteAddress
      });
      lastVoteTime = {};
      voteCount = {};
    });
  });

  httpServer.on('close', () => {
    clearInterval(interval);
  });

  setupAuth(app);

  // QR Code scan tracking endpoints
  app.post("/api/qr-scans", async (req, res) => {
    try {
      const { songId } = req.body;
      const sessionId = req.sessionID || Math.random().toString(36).substring(2);
      const userAgent = req.headers['user-agent'] || null;
      const referrer = req.headers.referer || req.headers.referrer || null;

      // Insert with explicit type casting
      const [scan] = await db.insert(qrCodeScans)
        .values({
          songId: Number(songId),
          sessionId,
          userAgent: userAgent ?? null,
          referrer: referrer ?? null,
          createdAt: new Date()
        })
        .returning();

      res.json(scan);
    } catch (error) {
      console.error('Failed to record QR code scan:', error);
      res.status(500).json({ error: "無法記錄QR碼掃描" });
    }
  });

  // Get QR code scan statistics (admin only)
  app.get("/api/qr-scans/stats", requireAdmin, async (req, res) => {
    try {
      // Get total scans count
      const totalScans = await db
        .select({ count: sql<number>`count(*)`.mapWith(Number) })
        .from(qrCodeScans);

      // Get scans by song
      const scansBySong = await db
        .select({
          songId: songs.id,
          title: songs.title,
          artist: songs.artist,
          scanCount: sql<number>`count(${qrCodeScans.id})`.mapWith(Number)
        })
        .from(qrCodeScans)
        .innerJoin(songs, eq(qrCodeScans.songId, songs.id))
        .groupBy(songs.id, songs.title, songs.artist)
        .orderBy(sql`count(${qrCodeScans.id}) DESC`);

      // Get scans by date
      const scansByDate = await db
        .select({
          date: sql<string>`date_trunc('day', ${qrCodeScans.createdAt})::text`,
          count: sql<number>`count(*)`.mapWith(Number)
        })
        .from(qrCodeScans)
        .groupBy(sql`date_trunc('day', ${qrCodeScans.createdAt})`)
        .orderBy(sql`date_trunc('day', ${qrCodeScans.createdAt}) DESC`);

      res.json({
        totalScans: totalScans[0].count,
        scansBySong,
        scansByDate,
      });
    } catch (error) {
      console.error('Failed to fetch QR code scan statistics:', error);
      res.status(500).json({ error: "無法取得QR碼掃描統計" });
    }
  });

  return httpServer;
}

async function getSongsWithVotes(): Promise<(Song & { voteCount: number })[]> {
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
    const message: SongsUpdateMessage = {
      type: 'SONGS_UPDATE',
      songs: songsList
    };

    const deadClients: WebSocketWithState[] = [];

    (wss.clients as Set<WebSocketWithState>).forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(JSON.stringify(message));
        } catch (error) {
          console.error('Error sending message to client:', error);
          deadClients.push(client);
        }
      } else if (client.readyState === WebSocket.CLOSED || client.readyState === WebSocket.CLOSING) {
        deadClients.push(client);
      }
    });

    deadClients.forEach(client => {
      try {
        client.terminate();
      } catch (error) {
        console.error('Error terminating dead client:', error);
      }
    });
  } catch (error) {
    console.error('Failed to send songs update:', error);
    throw error;
  }
}