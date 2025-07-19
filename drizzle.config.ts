import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/lib/db/schema/*',
  out: './src/lib/db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: './src/lib/db/spotify.db'
  },
  verbose: true,
  strict: true
})