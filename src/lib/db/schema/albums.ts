import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Popular albums
export const popularAlbums = sqliteTable('popular_albums', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  artist: text('artist').notNull(),
  coverImage: text('cover_image'), // URL to album cover
  releaseDate: text('release_date'),
  genre: text('genre'),
  trackCount: integer('track_count').default(0).notNull(),
  totalDuration: integer('total_duration').default(0), // total duration in seconds
  popularityScore: real('popularity_score').default(0).notNull(), // 0-100 popularity score
  monthlyPlays: integer('monthly_plays').default(0), // monthly play count
  totalPlays: integer('total_plays').default(0), // all-time play count
  averageRating: real('average_rating'), // average user rating 1-5
  label: text('label'), // record label
  spotifyId: text('spotify_id'), // Spotify album ID if available
  chartPosition: integer('chart_position'), // current chart position if applicable
  peakChartPosition: integer('peak_chart_position'), // highest chart position achieved
  isExplicit: integer('is_explicit', { mode: 'boolean' }).default(false).notNull(),
  isFeatured: integer('is_featured', { mode: 'boolean' }).default(false).notNull(), // featured on home page
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type PopularAlbum = typeof popularAlbums.$inferSelect;
export type NewPopularAlbum = typeof popularAlbums.$inferInsert;