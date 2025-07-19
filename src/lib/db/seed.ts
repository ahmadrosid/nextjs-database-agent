import { db } from './index';
import { songs, recentlyPlayed } from './schema';

export async function seedDatabase() {
  console.log('🌱 Seeding database...');

  // Sample songs data
  const sampleSongs = [
    {
      id: 'song-1',
      title: 'Blinding Lights',
      artist: 'The Weeknd',
      album: 'After Hours',
      albumArt: 'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36',
      duration: 200, // 3:20
    },
    {
      id: 'song-2',
      title: 'Shape of You',
      artist: 'Ed Sheeran',
      album: '÷ (Divide)',
      albumArt: 'https://i.scdn.co/image/ab67616d0000b273ba5db46f4b838ef6027e6f96',
      duration: 233, // 3:53
    },
    {
      id: 'song-3',
      title: 'Someone You Loved',
      artist: 'Lewis Capaldi',
      album: 'Divinely Uninspired To A Hellish Extent',
      albumArt: 'https://i.scdn.co/image/ab67616d0000b273fc2101e6889d6ce9025f85f2',
      duration: 182, // 3:02
    },
    {
      id: 'song-4',
      title: 'Watermelon Sugar',
      artist: 'Harry Styles',
      album: 'Fine Line',
      albumArt: 'https://i.scdn.co/image/ab67616d0000b273adce4a2e1eedb2e2a6d89f01',
      duration: 174, // 2:54
    },
    {
      id: 'song-5',
      title: 'Levitating',
      artist: 'Dua Lipa',
      album: 'Future Nostalgia',
      albumArt: 'https://i.scdn.co/image/ab67616d0000b273b762bf445398ac5a3b2c6ea0',
      duration: 203, // 3:23
    },
    {
      id: 'song-6',
      title: 'Good 4 U',
      artist: 'Olivia Rodrigo',
      album: 'SOUR',
      albumArt: 'https://i.scdn.co/image/ab67616d0000b273bd5b2f96f57b9c0b6f2c6e29',
      duration: 178, // 2:58
    },
    {
      id: 'song-7',
      title: 'As It Was',
      artist: 'Harry Styles',
      album: "Harry's House",
      albumArt: 'https://i.scdn.co/image/ab67616d0000b2732b7ca47b0013ac1c6fef5024',
      duration: 167, // 2:47
    },
    {
      id: 'song-8',
      title: 'Anti-Hero',
      artist: 'Taylor Swift',
      album: 'Midnights',
      albumArt: 'https://i.scdn.co/image/ab67616d0000b273bb54dde68cd23e2a268ae0f5',
      duration: 200, // 3:20
    },
  ];

  try {
    // Insert songs (ignore duplicates)
    console.log('📀 Inserting songs...');
    for (const song of sampleSongs) {
      await db.insert(songs)
        .values(song)
        .onConflictDoNothing();
    }

    // Create recently played entries (last 7 days)
    console.log('🎵 Creating recently played entries...');
    const now = Date.now();
    const recentlyPlayedData = [];

    // Generate realistic recently played data
    for (let i = 0; i < 20; i++) {
      const randomSong = sampleSongs[Math.floor(Math.random() * sampleSongs.length)];
      const randomTime = now - (Math.random() * 7 * 24 * 60 * 60 * 1000); // Last 7 days
      
      recentlyPlayedData.push({
        songId: randomSong.id,
        playedAt: new Date(randomTime),
        userId: 'user-1', // Default user
      });
    }

    // Sort by playedAt descending (most recent first)
    recentlyPlayedData.sort((a, b) => b.playedAt.getTime() - a.playedAt.getTime());

    // Insert recently played data
    await db.insert(recentlyPlayed)
      .values(recentlyPlayedData)
      .onConflictDoNothing();

    console.log('✅ Database seeded successfully!');
    console.log(`   - ${sampleSongs.length} songs added`);
    console.log(`   - ${recentlyPlayedData.length} recently played entries added`);
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run seed if this file is executed directly
seedDatabase()
  .then(() => {
    console.log('🎉 Seeding completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  });
