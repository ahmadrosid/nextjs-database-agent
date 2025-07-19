import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Songs table
export const songs = sqliteTable('songs', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  artist: text('artist').notNull(),
  album: text('album').notNull(),
  albumArt: text('album_art').notNull(),
  duration: integer('duration').notNull(), // in seconds
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Recently played songs table
export const recentlyPlayed = sqliteTable('recently_played', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  songId: text('song_id').notNull().references(() => songs.id, { onDelete: 'cascade' }),
  playedAt: integer('played_at', { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull(),
  userId: text('user_id'), // Optional: for multi-user support
});

// Types
export type Song = typeof songs.$inferSelect;
export type NewSong = typeof songs.$inferInsert;
export type RecentlyPlayed = typeof recentlyPlayed.$inferSelect;
export type NewRecentlyPlayed = typeof recentlyPlayed.$inferInsert;