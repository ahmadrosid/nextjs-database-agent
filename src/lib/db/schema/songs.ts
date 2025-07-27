import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const recentlyPlayedSongs = sqliteTable('recently_played_songs', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  artist: text('artist').notNull(),
  album: text('album'),
  duration: integer('duration'), // duration in seconds
  albumArt: text('album_art'), // URL to album artwork
  playedAt: text('played_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  playCount: integer('play_count').default(1).notNull(),
  spotifyId: text('spotify_id'), // Spotify track ID if available
  genre: text('genre'),
  year: integer('year'),
  rating: real('rating'), // User rating 1-5
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type RecentlyPlayedSong = typeof recentlyPlayedSongs.$inferSelect;
export type NewRecentlyPlayedSong = typeof recentlyPlayedSongs.$inferInsert;