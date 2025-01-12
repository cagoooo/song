import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const songs = pgTable("songs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  artist: text("artist").notNull(),
  key: text("key"),
  notes: text("notes"),
  lyrics: text("lyrics"),
  audioUrl: text("audio_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => users.id),
  isActive: boolean("is_active").default(true).notNull()
});

export const votes = pgTable("votes", {
  id: serial("id").primaryKey(),
  songId: integer("song_id").references(() => songs.id).notNull(),
  sessionId: text("session_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const songSuggestions = pgTable("song_suggestions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  artist: text("artist").notNull(),
  suggestedBy: text("suggested_by"),
  status: text("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  notes: text("notes")
});

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").unique().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const songTags = pgTable("song_tags", {
  id: serial("id").primaryKey(),
  songId: integer("song_id").references(() => songs.id).notNull(),
  tagId: integer("tag_id").references(() => tags.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const qrCodeScans = pgTable("qr_code_scans", {
  id: serial("id").primaryKey(),
  songId: integer("song_id").references(() => songs.id).notNull(),
  sessionId: text("session_id").notNull(),
  userAgent: text("user_agent"),
  referrer: text("referrer"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Define relationships
export const songsRelations = relations(songs, ({ one, many }) => ({
  creator: one(users, {
    fields: [songs.createdBy],
    references: [users.id],
  }),
  votes: many(votes),
  songTags: many(songTags),
  qrCodeScans: many(qrCodeScans)
}));

export const votesRelations = relations(votes, ({ one }) => ({
  song: one(songs, {
    fields: [votes.songId],
    references: [songs.id],
  })
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  songTags: many(songTags)
}));

export const songTagsRelations = relations(songTags, ({ one }) => ({
  song: one(songs, {
    fields: [songTags.songId],
    references: [songs.id],
  }),
  tag: one(tags, {
    fields: [songTags.tagId],
    references: [tags.id],
  })
}));

export const qrCodeScansRelations = relations(qrCodeScans, ({ one }) => ({
  song: one(songs, {
    fields: [qrCodeScans.songId],
    references: [songs.id],
  })
}));

// Type definitions
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

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

export const insertSongSchema = createInsertSchema(songs);
export const selectSongSchema = createSelectSchema(songs);

export const insertVoteSchema = createInsertSchema(votes);
export const selectVoteSchema = createSelectSchema(votes);

export const insertTagSchema = createInsertSchema(tags);
export const selectTagSchema = createSelectSchema(tags);

export const insertSongTagSchema = createInsertSchema(songTags);
export const selectSongTagSchema = createSelectSchema(songTags);

export const insertSongSuggestionSchema = createInsertSchema(songSuggestions);
export const selectSongSuggestionSchema = createSelectSchema(songSuggestions);

export const insertQRCodeScanSchema = createInsertSchema(qrCodeScans);
export const selectQRCodeScanSchema = createSelectSchema(qrCodeScans);