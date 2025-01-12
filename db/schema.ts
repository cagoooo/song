// Type definitions for database entities
export interface User {
  id: number;
  username: string;
  password: string;
  isAdmin: boolean;
  createdAt: Date;
}

export interface Song {
  id: number;
  title: string;
  artist: string;
  key?: string | null;
  notes?: string | null;
  lyrics?: string | null;
  audioUrl?: string | null;
  createdAt: Date;
  createdBy?: number | null;
  isActive: boolean;
}

export interface Vote {
  id: number;
  songId: number;
  sessionId: string;
  createdAt: Date;
}

export interface Tag {
  id: number;
  name: string;
  createdAt: Date;
}

export interface SongTag {
  id: number;
  songId: number;
  tagId: number;
  createdAt: Date;
}

export interface SongSuggestion {
  id: number;
  title: string;
  artist: string;
  suggestedBy?: string | null;
  status: string;
  createdAt: Date;
  notes?: string | null;
}

export interface QRCodeScan {
  id: number;
  songId: number;
  sessionId: string;
  userAgent?: string | null;
  referrer?: string | null;
  createdAt: Date;
}