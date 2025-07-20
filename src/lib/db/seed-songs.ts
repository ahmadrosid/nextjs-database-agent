import { db } from './index';
import { recentlyPlayedSongs } from './schema/songs';

const sampleSongs = [
  {
    title: "Blinding Lights",
    artist: "The Weeknd",
    album: "After Hours",
    duration: 200,
    albumArt: "https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36",
    genre: "Synth-pop",
    year: 2019,
    rating: 4.8,
    spotifyId: "0VjIjW4GlUK3d1Zz4PD4x8",
    playCount: 15
  },
  {
    title: "Shape of You",
    artist: "Ed Sheeran",
    album: "÷ (Divide)",
    duration: 233,
    albumArt: "https://i.scdn.co/image/ab67616d0000b273ba5db46f4b838ef6027e6f96",
    genre: "Pop",
    year: 2017,
    rating: 4.5,
    spotifyId: "7qiZfU4dY1lWllzX7mPBI3",
    playCount: 8
  },
  {
    title: "Someone Like You",
    artist: "Adele",
    album: "21",
    duration: 285,
    albumArt: "https://i.scdn.co/image/ab67616d0000b273372eb96d91c6a4e3b9aeaa96",
    genre: "Soul",
    year: 2011,
    rating: 4.9,
    spotifyId: "1zwMYTA5nlNjZxYrvBB2pV",
    playCount: 12
  },
  {
    title: "Bohemian Rhapsody",
    artist: "Queen",
    album: "A Night at the Opera",
    duration: 355,
    albumArt: "https://i.scdn.co/image/ab67616d0000b2732066129dfc6c2f938b0e5b31",
    genre: "Rock",
    year: 1975,
    rating: 5.0,
    spotifyId: "4u7EnebtmKWzUH433cf5Qv",
    playCount: 25
  },
  {
    title: "Bad Guy",
    artist: "Billie Eilish",
    album: "WHEN WE ALL FALL ASLEEP, WHERE DO WE GO?",
    duration: 194,
    albumArt: "https://i.scdn.co/image/ab67616d0000b273a9f6c04ba168640b48aa5795",
    genre: "Electropop",
    year: 2019,
    rating: 4.6,
    spotifyId: "2Fxmhks0bxGSBdJ92vM42m",
    playCount: 7
  },
  {
    title: "Watermelon Sugar",
    artist: "Harry Styles",
    album: "Fine Line",
    duration: 174,
    albumArt: "https://i.scdn.co/image/ab67616d0000b273adac6b1e9b5cc10b7a1d3e3b",
    genre: "Pop Rock",
    year: 2019,
    rating: 4.3,
    spotifyId: "6UelLqGlWMcVH1E5c4H7lY",
    playCount: 5
  }
];

export async function seedRecentlyPlayedSongs() {
  try {
    console.log('🌱 Seeding recently played songs...');
    
    // Insert sample songs
    for (const song of sampleSongs) {
      await db.insert(recentlyPlayedSongs).values(song);
    }
    
    console.log('✅ Successfully seeded recently played songs!');
    return true;
  } catch (error) {
    console.error('❌ Error seeding songs:', error);
    return false;
  }
}

// Run seed if this file is executed directly
seedRecentlyPlayedSongs().then(() => {
  process.exit(0);
});
