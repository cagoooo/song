import { WebSocketServer, type WebSocket } from "ws";
import type { Server } from "http";
import { db } from "@db";
import { votes } from "@db/schema";

interface VoteMessage {
  type: 'VOTE';
  songId: number;
}

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    // Generate a unique session ID for this connection
    const sessionId = Math.random().toString(36).substring(2);
    
    // Send initial songs data
    sendSongsUpdate(wss);

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString()) as VoteMessage;
        
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

  return wss;
}

async function sendSongsUpdate(wss: WebSocketServer) {
  try {
    // Get songs with vote counts
    const songsList = await db.query.songs.findMany();
    const votesList = await db.query.votes.findMany();
    
    const songsWithVotes = songsList.map(song => ({
      ...song,
      voteCount: votesList.filter(vote => vote.songId === song.id).length
    }));

    // Broadcast to all connected clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'SONGS_UPDATE',
          songs: songsWithVotes
        }));
      }
    });
  } catch (error) {
    console.error('Failed to send songs update:', error);
  }
}
