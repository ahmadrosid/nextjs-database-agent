import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Made for you playlists
export const madeForYouPlaylists = sqliteTable('made_for_you_playlists', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description'),
  coverImage: text('cover_image'), // URL to cover image
  trackCount: integer('track_count').default(0).notNull(),
  totalDuration: integer('total_duration').default(0), // total duration in seconds
  category: text('category').notNull(), // e.g., "Daily Mix", "Discovery Weekly", "Release Radar"
  personalizationScore: real('personalization_score').default(0), // 0-1 how personalized it is
  lastUpdated: text('last_updated').default(sql`CURRENT_TIMESTAMP`).notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  spotifyId: text('spotify_id'), // Spotify playlist ID if available
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type MadeForYouPlaylist = typeof madeForYouPlaylists.$inferSelect;
export type NewMadeForYouPlaylist = typeof madeForYouPlaylists.$inferInsert;