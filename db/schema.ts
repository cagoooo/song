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

// Define relationships
export const usersRelations = relations(users, ({ many }) => ({
  songs: many(songs)
}));

export const songsRelations = relations(songs, ({ one, many }) => ({
  creator: one(users, {
    fields: [songs.createdBy],
    references: [users.id],
  }),
  votes: many(votes)
}));

export const votesRelations = relations(votes, ({ one }) => ({
  song: one(songs, {
    fields: [votes.songId],
    references: [songs.id],
  })
}));

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const insertSongSchema = createInsertSchema(songs);
export const selectSongSchema = createSelectSchema(songs);
export type Song = typeof songs.$inferSelect;
export type NewSong = typeof songs.$inferInsert;

export const insertVoteSchema = createInsertSchema(votes);
export const selectVoteSchema = createSelectSchema(votes);
export type Vote = typeof votes.$inferSelect;
export type NewVote = typeof votes.$inferInsert;