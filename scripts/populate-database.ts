import { db, categories, playlists, type NewCategory, type NewPlaylist } from '../src/lib/db'

async function populateDatabase() {
  console.log('🗂️  Populating database with Spotify data...')

  try {
    // Create categories
    const categoriesData: NewCategory[] = [
      {
        name: 'Made For You',
        slug: 'made-for-you'
      },
      {
        name: 'Popular Albums',
        slug: 'popular-albums'
      },
      {
        name: 'Recently Played',
        slug: 'recently-played'
      }
    ]

    console.log('📁 Creating categories...')
    const insertedCategories = await db.insert(categories).values(categoriesData).returning()
    
    // Get category IDs for reference
    const madeForYouCategory = insertedCategories.find(cat => cat.slug === 'made-for-you')
    const popularAlbumsCategory = insertedCategories.find(cat => cat.slug === 'popular-albums')
    const recentlyPlayedCategory = insertedCategories.find(cat => cat.slug === 'recently-played')

    if (!madeForYouCategory || !popularAlbumsCategory || !recentlyPlayedCategory) {
      throw new Error('Failed to create categories')
    }

    // Made For You data (from original static data)
    const madeForYouData: NewPlaylist[] = [
      {
        externalId: "7",
        title: "Discover Weekly",
        artist: "Your weekly mixtape of fresh music",
        album: "Weekly Discovery",
        image: "https://v3.fal.media/files/kangaroo/HRayeBi01JIqfkCjjoenp_output.png",
        duration: 210,
        categoryId: madeForYouCategory.id
      },
      {
        externalId: "8",
        title: "Release Radar",
        artist: "Catch all the latest music from artists you follow",
        album: "New Music Friday",
        image: "https://v3.fal.media/files/panda/q7hWJCgH2Fy4cJdWqAzuk_output.png",
        duration: 195,
        categoryId: madeForYouCategory.id
      },
      {
        externalId: "9",
        title: "Daily Mix 1",
        artist: "Billie Eilish, Lorde, Clairo and more",
        album: "Alternative Mix",
        image: "https://v3.fal.media/files/elephant/N5qDbXOpqAlIcK7kJ4BBp_output.png",
        duration: 225,
        categoryId: madeForYouCategory.id
      },
      {
        externalId: "10",
        title: "Daily Mix 2",
        artist: "Arctic Monkeys, The Strokes, Tame Impala and more",
        album: "Indie Rock Mix",
        image: "https://v3.fal.media/files/rabbit/tAQ6AzJJdlEZW-y4eNdxO_output.png",
        duration: 240,
        categoryId: madeForYouCategory.id
      },
      {
        externalId: "11",
        title: "Daily Mix 3",
        artist: "Taylor Swift, Olivia Rodrigo, Gracie Abrams and more",
        album: "Pop Mix",
        image: "https://v3.fal.media/files/rabbit/b11V_uidRMsa2mTr5mCfz_output.png",
        duration: 190,
        categoryId: madeForYouCategory.id
      },
      {
        externalId: "12",
        title: "On Repeat",
        artist: "The songs you can't get enough of",
        album: "Your Favorites",
        image: "https://v3.fal.media/files/rabbit/mVegWQYIe0yj8NixTQQG-_output.png",
        duration: 220,
        categoryId: madeForYouCategory.id
      }
    ]

    // Popular Albums data (from original static data)
    const popularAlbumsData: NewPlaylist[] = [
      {
        externalId: "13",
        title: "Midnights",
        artist: "Taylor Swift",
        album: "Midnights",
        image: "https://v3.fal.media/files/elephant/C_rLsEbIUdbn6nQ0wz14S_output.png",
        duration: 275,
        categoryId: popularAlbumsCategory.id
      },
      {
        externalId: "14",
        title: "Harry's House",
        artist: "Harry Styles",
        album: "Harry's House",
        image: "https://v3.fal.media/files/panda/kvQ0deOgoUWHP04ajVH3A_output.png",
        duration: 245,
        categoryId: popularAlbumsCategory.id
      },
      {
        externalId: "15",
        title: "Un Verano Sin Ti",
        artist: "Bad Bunny",
        album: "Un Verano Sin Ti",
        image: "https://v3.fal.media/files/kangaroo/HRayeBi01JIqfkCjjoenp_output.png",
        duration: 265,
        categoryId: popularAlbumsCategory.id
      },
      {
        externalId: "16",
        title: "Renaissance",
        artist: "Beyoncé",
        album: "Renaissance",
        image: "https://v3.fal.media/files/elephant/N5qDbXOpqAlIcK7kJ4BBp_output.png",
        duration: 290,
        categoryId: popularAlbumsCategory.id
      },
      {
        externalId: "17",
        title: "SOUR",
        artist: "Olivia Rodrigo",
        album: "SOUR",
        image: "https://v3.fal.media/files/rabbit/tAQ6AzJJdlEZW-y4eNdxO_output.png",
        duration: 215,
        categoryId: popularAlbumsCategory.id
      },
      {
        externalId: "18",
        title: "Folklore",
        artist: "Taylor Swift",
        album: "Folklore",
        image: "https://v3.fal.media/files/rabbit/b11V_uidRMsa2mTr5mCfz_output.png",
        duration: 285,
        categoryId: popularAlbumsCategory.id
      },
      {
        externalId: "19",
        title: "Fine Line",
        artist: "Harry Styles",
        album: "Fine Line",
        image: "https://v3.fal.media/files/panda/q7hWJCgH2Fy4cJdWqAzuk_output.png",
        duration: 255,
        categoryId: popularAlbumsCategory.id
      },
      {
        externalId: "20",
        title: "After Hours",
        artist: "The Weeknd",
        album: "After Hours",
        image: "https://v3.fal.media/files/kangaroo/0OgdfDAzLEbkda0m7uLJw_output.png",
        duration: 270,
        categoryId: popularAlbumsCategory.id
      }
    ]

    // Recently Played data (from original static data)
    const recentlyPlayedData: NewPlaylist[] = [
      {
        externalId: "1",
        title: "Liked Songs",
        artist: "320 songs",
        album: "Your Music",
        image: "https://v3.fal.media/files/panda/kvQ0deOgoUWHP04ajVH3A_output.png",
        duration: 180,
        categoryId: recentlyPlayedCategory.id
      },
      {
        externalId: "2",
        title: "Discover Weekly",
        artist: "Spotify",
        album: "Weekly Mix",
        image: "https://v3.fal.media/files/kangaroo/HRayeBi01JIqfkCjjoenp_output.png",
        duration: 210,
        categoryId: recentlyPlayedCategory.id
      },
      {
        externalId: "3",
        title: "Release Radar",
        artist: "Spotify",
        album: "New Releases",
        image: "https://v3.fal.media/files/panda/q7hWJCgH2Fy4cJdWqAzuk_output.png",
        duration: 195,
        categoryId: recentlyPlayedCategory.id
      },
      {
        externalId: "4",
        title: "Daily Mix 1",
        artist: "Spotify",
        album: "Daily Mix",
        image: "https://v3.fal.media/files/elephant/N5qDbXOpqAlIcK7kJ4BBp_output.png",
        duration: 225,
        categoryId: recentlyPlayedCategory.id
      },
      {
        externalId: "5",
        title: "Chill Hits",
        artist: "Spotify",
        album: "Chill Collection",
        image: "https://v3.fal.media/files/rabbit/tAQ6AzJJdlEZW-y4eNdxO_output.png",
        duration: 240,
        categoryId: recentlyPlayedCategory.id
      },
      {
        externalId: "6",
        title: "Top 50 - Global",
        artist: "Spotify",
        album: "Global Charts",
        image: "https://v3.fal.media/files/kangaroo/0OgdfDAzLEbkda0m7uLJw_output.png",
        duration: 205,
        categoryId: recentlyPlayedCategory.id
      }
    ]

    // Insert all playlists
    console.log('🎵 Creating Made For You playlists...')
    await db.insert(playlists).values(madeForYouData)

    console.log('📀 Creating Popular Albums...')
    await db.insert(playlists).values(popularAlbumsData)

    console.log('🕒 Creating Recently Played items...')
    await db.insert(playlists).values(recentlyPlayedData)

    console.log('✅ Database populated successfully!')
    
    // Show summary
    const totalPlaylists = await db.select().from(playlists)
    const totalCategories = await db.select().from(categories)
    
    console.log(`📊 Summary:`)
    console.log(`   Categories: ${totalCategories.length}`)
    console.log(`   Playlists: ${totalPlaylists.length}`)
    console.log(`   Made For You: ${madeForYouData.length}`)
    console.log(`   Popular Albums: ${popularAlbumsData.length}`)
    console.log(`   Recently Played: ${recentlyPlayedData.length}`)

  } catch (error) {
    console.error('❌ Error populating database:', error)
    process.exit(1)
  }
}

// Run the population script
populateDatabase().then(() => {
  console.log('🎉 Database population complete!')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Error:', error)
  process.exit(1)
})

export default populateDatabase
