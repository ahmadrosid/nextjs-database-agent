import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'

// Categories for different sections
export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// Playlists/Albums table
export const playlists = sqliteTable('playlists', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  externalId: text('external_id').notNull().unique(), // Original ID from static data
  title: text('title').notNull(),
  artist: text('artist').notNull(),
  album: text('album'),
  image: text('image'),
  duration: integer('duration'), // in seconds
  categoryId: integer('category_id').references(() => categories.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// Define relationships
export const categoriesRelations = relations(categories, ({ many }) => ({
  playlists: many(playlists),
}))

export const playlistsRelations = relations(playlists, ({ one }) => ({
  category: one(categories, {
    fields: [playlists.categoryId],
    references: [categories.id],
  }),
}))

// Export types for TypeScript
export type Category = typeof categories.$inferSelect
export type NewCategory = typeof categories.$inferInsert
export type Playlist = typeof playlists.$inferSelect
export type NewPlaylist = typeof playlists.$inferInsert