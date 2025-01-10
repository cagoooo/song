import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { db } from "@db";
import { songs, votes } from "@db/schema";

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // WebSocket setup
  wss.on('connection', (ws) => {
    // Generate a unique session ID for this connection
    const sessionId = Math.random().toString(36).substring(2);

    // Send initial songs data
    sendSongsUpdate(wss);

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'VOTE') {
          // Record the vote
          await db.insert(votes).values({
            songId: message.songId,
            sessionId
          });

          // Broadcast updated songs to all clients
          sendSongsUpdate(wss);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
  });

  // REST API routes
  app.post("/api/songs", async (req, res) => {
    try {
      const { title, artist, key, notes } = req.body;
      const [newSong] = await db.insert(songs).values({ title, artist, key, notes }).returning();

      const songsList = await getSongsWithVotes();
      wss.clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({ type: 'SONGS_UPDATE', songs: songsList }));
        }
      });

      res.json(newSong);
    } catch (error) {
      console.error('Failed to add song:', error);
      res.status(500).json({ error: "Failed to add song" });
    }
  });

  app.get("/api/songs", async (_req, res) => {
    try {
      const songsList = await getSongsWithVotes();
      res.json(songsList);
    } catch (error) {
      console.error('Failed to fetch songs:', error);
      res.status(500).json({ error: "Failed to fetch songs" });
    }
  });

  return httpServer;
}

async function getSongsWithVotes() {
  const songsList = await db.query.songs.findMany();
  const votesList = await db.query.votes.findMany();

  return songsList.map(song => ({
    ...song,
    voteCount: votesList.filter(vote => vote.songId === song.id).length
  }));
}

function sendSongsUpdate(wss: WebSocketServer) {
  getSongsWithVotes().then(songsList => {
    wss.clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ type: 'SONGS_UPDATE', songs: songsList }));
      }
    });
  });
}