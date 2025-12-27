import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { 
  firestore, 
  collection, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy,
  Timestamp,
  COLLECTIONS
} from "../db/firebase";
import { setupAuth } from "./auth";
import type { IncomingMessage } from "http";

interface User {
  id: string;
  username: string;
  password: string;
  isAdmin: boolean;
  createdAt: any;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

async function getSongsWithVotes() {
  const songsRef = collection(firestore, COLLECTIONS.songs);
  const songsQuery = query(songsRef, where("isActive", "==", true));
  const songsSnapshot = await getDocs(songsQuery);
  
  const votesRef = collection(firestore, COLLECTIONS.votes);
  const votesSnapshot = await getDocs(votesRef);
  
  const voteMap = new Map<string, number>();
  votesSnapshot.forEach(doc => {
    const songId = doc.data().songId;
    voteMap.set(songId, (voteMap.get(songId) || 0) + 1);
  });
  
  const songs: any[] = [];
  songsSnapshot.forEach(doc => {
    const data = doc.data();
    songs.push({
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || data.createdAt,
      voteCount: voteMap.get(doc.id) || 0
    });
  });
  
  return songs;
}

async function sendSongsUpdate(wss: WebSocketServer) {
  try {
    const songsList = await getSongsWithVotes();
    wss.clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({
          type: 'SONGS_UPDATE',
          songs: songsList
        }));
      }
    });
  } catch (error) {
    console.error('Failed to send songs update:', error);
  }
}

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({
    server: httpServer,
    path: '/ws',
    verifyClient: ({ req }: { req: IncomingMessage }) => {
      const protocol = req.headers['sec-websocket-protocol'];
      return protocol !== 'vite-hmr';
    }
  });

  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ error: "需要管理員權限" });
    }
    next();
  };

  setupAuth(app);

  app.get("/api/suggestions", async (_req, res) => {
    try {
      const suggestionsRef = collection(firestore, COLLECTIONS.songSuggestions);
      const suggestionsSnapshot = await getDocs(suggestionsRef);
      
      const suggestions: any[] = [];
      suggestionsSnapshot.forEach(doc => {
        const data = doc.data();
        suggestions.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || data.createdAt
        });
      });
      
      suggestions.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });
      
      res.json(suggestions);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      res.status(500).json({ error: "無法取得歌曲建議列表" });
    }
  });

  app.post("/api/suggestions", async (req, res) => {
    try {
      const { title, artist, suggestedBy, notes } = req.body;

      if (!title?.trim()) {
        return res.status(400).json({ error: "歌曲名稱不能為空" });
      }
      if (title.length > 100) {
        return res.status(400).json({ error: "歌曲名稱不能超過100個字符" });
      }
      if (artist && artist.length > 100) {
        return res.status(400).json({ error: "歌手名稱不能超過100個字符" });
      }
      if (notes && notes.length > 500) {
        return res.status(400).json({ error: "備註不能超過500個字符" });
      }

      const suggestionsRef = collection(firestore, COLLECTIONS.songSuggestions);
      const artistValue = artist?.trim() || "不確定";
      const newDoc = await addDoc(suggestionsRef, {
        title: title.trim(),
        artist: artistValue,
        suggestedBy: suggestedBy?.trim() || null,
        notes: notes?.trim() || null,
        status: 'pending',
        createdAt: Timestamp.now()
      });

      const suggestion = {
        id: newDoc.id,
        title: title.trim(),
        artist: artistValue,
        suggestedBy: suggestedBy?.trim() || null,
        notes: notes?.trim() || null,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      res.json(suggestion);
    } catch (error) {
      console.error('Failed to create suggestion:', error);
      res.status(500).json({ 
        error: "無法新增歌曲建議",
        details: "請稍後再試，或聯繫管理員"
      });
    }
  });

  app.patch("/api/suggestions/:id/status", requireAdmin, async (req, res) => {
    try {
      const id = req.params.id;
      const { status } = req.body;

      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: "無效的狀態" });
      }

      const suggestionRef = doc(firestore, COLLECTIONS.songSuggestions, id);
      await updateDoc(suggestionRef, { status });

      const updatedDoc = await getDoc(suggestionRef);
      res.json({ id, ...updatedDoc.data() });
    } catch (error) {
      console.error('Failed to update suggestion status:', error);
      res.status(500).json({ error: "無法更新建議狀態" });
    }
  });

  app.delete("/api/suggestions/:id", requireAdmin, async (req, res) => {
    try {
      const id = req.params.id;
      const suggestionRef = doc(firestore, COLLECTIONS.songSuggestions, id);
      await deleteDoc(suggestionRef);
      res.json({ message: "建議已刪除" });
    } catch (error) {
      console.error('Failed to delete suggestion:', error);
      res.status(500).json({ error: "無法刪除建議" });
    }
  });

  app.patch("/api/songs/:id", requireAdmin, async (req, res) => {
    try {
      const id = req.params.id;
      const { title, artist } = req.body;

      const songRef = doc(firestore, COLLECTIONS.songs, id);
      await updateDoc(songRef, { title, artist });

      const updatedDoc = await getDoc(songRef);
      await sendSongsUpdate(wss);
      res.json({ id, ...updatedDoc.data() });
    } catch (error) {
      console.error('Failed to update song:', error);
      res.status(500).json({ error: "更新歌曲失敗" });
    }
  });

  app.post("/api/qr-scans", async (req, res) => {
    try {
      const { songId } = req.body;
      const sessionId = req.sessionID || Math.random().toString(36).substring(2);
      const userAgent = req.headers['user-agent'];
      const referrer = req.headers.referer || req.headers.referrer;

      const scansRef = collection(firestore, COLLECTIONS.qrCodeScans);
      const newDoc = await addDoc(scansRef, {
        songId,
        sessionId,
        userAgent: userAgent || null,
        referrer: referrer || null,
        createdAt: Timestamp.now()
      });

      res.json({ id: newDoc.id, songId, sessionId });
    } catch (error) {
      console.error('Failed to record QR code scan:', error);
      res.status(500).json({ error: "無法記錄QR碼掃描" });
    }
  });

  app.get("/api/qr-scans/stats", requireAdmin, async (req, res) => {
    try {
      const scansRef = collection(firestore, COLLECTIONS.qrCodeScans);
      const scansSnapshot = await getDocs(scansRef);
      
      const songsRef = collection(firestore, COLLECTIONS.songs);
      const songsSnapshot = await getDocs(songsRef);
      
      const songsMap = new Map<string, any>();
      songsSnapshot.forEach(doc => {
        songsMap.set(doc.id, { id: doc.id, ...doc.data() });
      });
      
      const scansBySongMap = new Map<string, number>();
      const scansByDateMap = new Map<string, number>();
      
      scansSnapshot.forEach(doc => {
        const data = doc.data();
        const songId = data.songId;
        scansBySongMap.set(songId, (scansBySongMap.get(songId) || 0) + 1);
        
        const date = data.createdAt?.toDate?.()?.toISOString().split('T')[0] || 'unknown';
        scansByDateMap.set(date, (scansByDateMap.get(date) || 0) + 1);
      });
      
      const scansBySong = Array.from(scansBySongMap.entries()).map(([songId, count]) => {
        const song = songsMap.get(songId);
        return {
          songId,
          title: song?.title || 'Unknown',
          artist: song?.artist || 'Unknown',
          scanCount: count
        };
      }).sort((a, b) => b.scanCount - a.scanCount);
      
      const scansByDate = Array.from(scansByDateMap.entries()).map(([date, count]) => ({
        date,
        count
      })).sort((a, b) => b.date.localeCompare(a.date));

      res.json({
        totalScans: scansSnapshot.size,
        scansBySong,
        scansByDate,
      });
    } catch (error) {
      console.error('Failed to fetch QR code scan statistics:', error);
      res.status(500).json({ error: "無法取得QR碼掃描統計" });
    }
  });

  app.get("/api/songs", async (_req, res) => {
    try {
      const songsList = await getSongsWithVotes();
      res.json(songsList);
    } catch (error) {
      console.error('Failed to fetch songs:', error);
      res.status(500).json({ error: "無法取得歌曲清單" });
    }
  });

  app.post("/api/songs", requireAdmin, async (req, res) => {
    try {
      const { title, artist, notes, suggestedBy, fromSuggestion } = req.body;
      
      const songsRef = collection(firestore, COLLECTIONS.songs);
      const newDoc = await addDoc(songsRef, {
        title,
        artist,
        notes: notes || null,
        createdBy: req.user?.id || null,
        isActive: true,
        createdAt: Timestamp.now()
      });

      if (fromSuggestion) {
        const suggestionRef = doc(firestore, COLLECTIONS.songSuggestions, fromSuggestion);
        await updateDoc(suggestionRef, { 
          status: "added_to_playlist",
          processedAt: Timestamp.now() 
        });
      }

      await sendSongsUpdate(wss);
      res.json({ id: newDoc.id, title, artist });
    } catch (error) {
      console.error('Failed to add song:', error);
      res.status(500).json({ error: "新增歌曲失敗" });
    }
  });

  wss.on('connection', (ws) => {
    const sessionId = Math.random().toString(36).substring(2);

    sendSongsUpdate(wss);

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'VOTE') {
          const votesRef = collection(firestore, COLLECTIONS.votes);
          await addDoc(votesRef, {
            songId: message.songId,
            sessionId,
            createdAt: Timestamp.now()
          });

          await sendSongsUpdate(wss);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'ERROR',
          message: 'Failed to process message'
        }));
      }
    });

    ws.on('error', () => {
    });

    ws.on('close', () => {
    });
  });

  app.get("/api/tags", async (_req, res) => {
    try {
      const tagsRef = collection(firestore, COLLECTIONS.tags);
      const tagsSnapshot = await getDocs(tagsRef);
      
      const allTags: any[] = [];
      tagsSnapshot.forEach(doc => {
        allTags.push({ id: doc.id, ...doc.data() });
      });
      
      res.json(allTags);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
      res.status(500).json({ error: "無法取得標籤列表" });
    }
  });

  app.post("/api/tags", requireAdmin, async (req, res) => {
    try {
      const { name } = req.body;
      
      if (!name || !name.trim()) {
        return res.status(400).json({ error: "標籤名稱不能為空" });
      }
      
      const tagsRef = collection(firestore, COLLECTIONS.tags);
      const existingQuery = query(tagsRef, where("name", "==", name.trim()));
      const existingSnapshot = await getDocs(existingQuery);
        
      if (!existingSnapshot.empty) {
        return res.status(400).json({ error: "標籤已存在" });
      }
      
      const newDoc = await addDoc(tagsRef, { 
        name: name.trim(),
        createdAt: Timestamp.now() 
      });
        
      res.json({ id: newDoc.id, name: name.trim() });
    } catch (error) {
      console.error('Failed to create tag:', error);
      res.status(500).json({ error: "無法創建標籤" });
    }
  });
  
  app.delete("/api/tags/:id", requireAdmin, async (req, res) => {
    try {
      const id = req.params.id;
      
      const songTagsRef = collection(firestore, COLLECTIONS.songTags);
      const songTagsQuery = query(songTagsRef, where("tagId", "==", id));
      const songTagsSnapshot = await getDocs(songTagsQuery);
      
      const deletePromises: Promise<void>[] = [];
      songTagsSnapshot.forEach(doc => {
        deletePromises.push(deleteDoc(doc.ref));
      });
      await Promise.all(deletePromises);
      
      const tagRef = doc(firestore, COLLECTIONS.tags, id);
      await deleteDoc(tagRef);
      
      await sendSongsUpdate(wss);
      res.json({ message: "標籤已刪除" });
    } catch (error) {
      console.error('Failed to delete tag:', error);
      res.status(500).json({ error: "無法刪除標籤" });
    }
  });

  app.get("/api/songs/:songId/tags", async (req, res) => {
    try {
      const songId = req.params.songId;
      
      const songTagsRef = collection(firestore, COLLECTIONS.songTags);
      const songTagsQuery = query(songTagsRef, where("songId", "==", songId));
      const songTagsSnapshot = await getDocs(songTagsQuery);
      
      const tagIds: string[] = [];
      songTagsSnapshot.forEach(doc => {
        tagIds.push(doc.data().tagId);
      });
      
      const tagsRef = collection(firestore, COLLECTIONS.tags);
      const tagsSnapshot = await getDocs(tagsRef);
      
      const tagsMap = new Map<string, any>();
      tagsSnapshot.forEach(doc => {
        tagsMap.set(doc.id, { id: doc.id, ...doc.data() });
      });
      
      const songTags = tagIds.map(tagId => tagsMap.get(tagId)).filter(Boolean);
      
      res.json(songTags);
    } catch (error) {
      console.error('Failed to fetch song tags:', error);
      res.status(500).json({ error: "無法取得歌曲標籤" });
    }
  });

  app.post("/api/songs/:songId/tags", requireAdmin, async (req, res) => {
    try {
      const songId = req.params.songId;
      const { tagId } = req.body;

      const songTagsRef = collection(firestore, COLLECTIONS.songTags);
      const existingQuery = query(songTagsRef, 
        where("songId", "==", songId),
        where("tagId", "==", tagId)
      );
      const existingSnapshot = await getDocs(existingQuery);

      if (!existingSnapshot.empty) {
        return res.status(400).json({ error: "標籤已存在" });
      }

      await addDoc(songTagsRef, { 
        songId, 
        tagId, 
        createdAt: Timestamp.now() 
      });

      await sendSongsUpdate(wss);
      res.json({ message: "標籤新增成功" });
    } catch (error) {
      console.error('Failed to add song tag:', error);
      res.status(500).json({ error: "無法新增歌曲標籤" });
    }
  });

  app.delete("/api/songs/:songId/tags/:tagId", requireAdmin, async (req, res) => {
    try {
      const songId = req.params.songId;
      const tagId = req.params.tagId;

      const songTagsRef = collection(firestore, COLLECTIONS.songTags);
      const deleteQuery = query(songTagsRef, 
        where("songId", "==", songId),
        where("tagId", "==", tagId)
      );
      const snapshot = await getDocs(deleteQuery);
      
      const deletePromises: Promise<void>[] = [];
      snapshot.forEach(doc => {
        deletePromises.push(deleteDoc(doc.ref));
      });
      await Promise.all(deletePromises);

      await sendSongsUpdate(wss);
      res.json({ message: "標籤移除成功" });
    } catch (error) {
      console.error('Failed to remove song tag:', error);
      res.status(500).json({ error: "無法移除歌曲標籤" });
    }
  });

  app.post("/api/songs/batch", requireAdmin, async (req, res) => {
    try {
      const { songs: songsList } = req.body;

      if (!Array.isArray(songsList)) {
        return res.status(400).json({ error: "無效的歌曲清單格式" });
      }

      const songsRef = collection(firestore, COLLECTIONS.songs);
      
      // Get existing songs to check for duplicates
      const existingSnapshot = await getDocs(songsRef);
      const existingSongs = new Set<string>();
      existingSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.isActive !== false) {
          existingSongs.add(`${data.title.toLowerCase()}|${data.artist.toLowerCase()}`);
        }
      });

      // Filter out duplicates
      const newSongs = songsList.filter(song => {
        const key = `${song.title.toLowerCase()}|${song.artist.toLowerCase()}`;
        return !existingSongs.has(key);
      });

      if (newSongs.length === 0) {
        return res.json({ message: "所有歌曲都已存在，無需匯入", added: 0, skipped: songsList.length });
      }

      const addPromises = newSongs.map(song => 
        addDoc(songsRef, {
          title: song.title,
          artist: song.artist,
          createdBy: req.user?.id || null,
          isActive: true,
          createdAt: Timestamp.now()
        })
      );
      
      await Promise.all(addPromises);

      await sendSongsUpdate(wss);
      res.json({ 
        message: `成功匯入 ${newSongs.length} 首歌曲，跳過 ${songsList.length - newSongs.length} 首重複歌曲`,
        added: newSongs.length,
        skipped: songsList.length - newSongs.length
      });
    } catch (error) {
      console.error('Failed to batch import songs:', error);
      res.status(500).json({ error: "批次匯入失敗" });
    }
  });

  app.delete("/api/songs/:id", requireAdmin, async (req, res) => {
    try {
      const id = req.params.id;
      const songRef = doc(firestore, COLLECTIONS.songs, id);
      await updateDoc(songRef, { isActive: false });

      await sendSongsUpdate(wss);
      res.json({ message: "歌曲已刪除" });
    } catch (error) {
      console.error('Failed to delete song:', error);
      res.status(500).json({ error: "刪除歌曲失敗" });
    }
  });

  app.post("/api/songs/reset-votes", requireAdmin, async (_req, res) => {
    try {
      const votesRef = collection(firestore, COLLECTIONS.votes);
      const votesSnapshot = await getDocs(votesRef);
      
      const deletePromises: Promise<void>[] = [];
      votesSnapshot.forEach(doc => {
        deletePromises.push(deleteDoc(doc.ref));
      });
      await Promise.all(deletePromises);
      
      await sendSongsUpdate(wss);
      res.json({ message: "所有點播次數已重置" });
    } catch (error) {
      console.error('Failed to reset votes:', error);
      res.status(500).json({ error: "無法重置點播次數" });
    }
  });

  return httpServer;
}
