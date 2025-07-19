import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { join } from 'path'
import * as schema from './schema'

// Create database file path
const dbPath = join(process.cwd(), 'src/lib/db/spotify.db')

// Create database connection
const sqlite = new Database(dbPath)

// Enable foreign key constraints
sqlite.pragma('foreign_keys = ON')

// Create drizzle instance
export const db = drizzle(sqlite, { schema })

export * from './schema'