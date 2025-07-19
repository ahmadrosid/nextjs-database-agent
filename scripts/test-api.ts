import { db, playlists, categories } from '../src/lib/db'
import { eq } from 'drizzle-orm'

async function testDatabase() {
  console.log('🧪 Testing database connection and data...')
  
  try {
    // Test categories
    const allCategories = await db.select().from(categories)
    console.log('📁 Categories:', allCategories.length)
    allCategories.forEach(cat => {
      console.log(`  - ${cat.name} (${cat.slug})`)
    })

    // Test Made For You playlists
    const madeForYouPlaylists = await db
      .select({
        id: playlists.id,
        title: playlists.title,
        artist: playlists.artist,
        image: playlists.image,
        categoryName: categories.name
      })
      .from(playlists)
      .leftJoin(categories, eq(playlists.categoryId, categories.id))
      .where(eq(categories.slug, 'made-for-you'))

    console.log('\n🎵 Made For You playlists:', madeForYouPlaylists.length)
    madeForYouPlaylists.forEach(playlist => {
      console.log(`  - ${playlist.title} by ${playlist.artist}`)
    })

    // Test Popular Albums
    const popularAlbumsPlaylists = await db
      .select({
        id: playlists.id,
        title: playlists.title,
        artist: playlists.artist,
        image: playlists.image,
        categoryName: categories.name
      })
      .from(playlists)
      .leftJoin(categories, eq(playlists.categoryId, categories.id))
      .where(eq(categories.slug, 'popular-albums'))

    console.log('\n📀 Popular Albums:', popularAlbumsPlaylists.length)
    popularAlbumsPlaylists.forEach(album => {
      console.log(`  - ${album.title} by ${album.artist}`)
    })

    console.log('\n✅ Database test completed successfully!')
  } catch (error) {
    console.error('❌ Database test failed:', error)
    process.exit(1)
  }
}

testDatabase().then(() => {
  console.log('🎉 All tests passed!')
  process.exit(0)
})