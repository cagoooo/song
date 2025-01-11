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

// Schema types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Song = typeof songs.$inferSelect;
export type NewSong = typeof songs.$inferInsert;

export type Vote = typeof votes.$inferSelect;
export type NewVote = typeof votes.$inferInsert;

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;

export type SongTag = typeof songTags.$inferSelect;
export type NewSongTag = typeof songTags.$inferInsert;

export type SongSuggestion = typeof songSuggestions.$inferSelect;
export type NewSongSuggestion = typeof songSuggestions.$inferInsert;

export type QRCodeScan = typeof qrCodeScans.$inferSelect;
export type NewQRCodeScan = typeof qrCodeScans.$inferInsert;

// Zod schemas
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