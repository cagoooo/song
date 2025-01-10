import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupWebSocket } from "./ws";
import { db } from "@db";
import { songs, votes } from "@db/schema";
import { eq } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);
  const wss = setupWebSocket(httpServer);

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
      res.status(500).json({ error: "Failed to add song" });
    }
  });

  app.get("/api/songs", async (_req, res) => {
    try {
      const songsList = await getSongsWithVotes();
      res.json(songsList);
    } catch (error) {
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
