import { db } from './index';
import { madeForYouPlaylists } from './schema/playlists';

export const seedMadeForYouPlaylists = async () => {
  const playlists = [
    {
      title: "Daily Mix 1",
      description: "Made for you based on Taylor Swift, Ed Sheeran, and more",
      coverImage: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop",
      trackCount: 50,
      totalDuration: 3000, // 50 minutes
      category: "Daily Mix",
      personalizationScore: 0.95,
    },
    {
      title: "Daily Mix 2", 
      description: "Made for you based on Drake, The Weeknd, and more",
      coverImage: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop",
      trackCount: 50,
      totalDuration: 3200, // 53 minutes
      category: "Daily Mix",
      personalizationScore: 0.92,
    },
    {
      title: "Discover Weekly",
      description: "Your weekly mixtape of fresh music. Enjoy new music and deep cuts picked for you.",
      coverImage: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop",
      trackCount: 30,
      totalDuration: 1800, // 30 minutes
      category: "Discovery Weekly",
      personalizationScore: 0.88,
    },
    {
      title: "Release Radar",
      description: "Catch all the latest music from artists you follow, plus new singles picked for you.",
      coverImage: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop&sat=2",
      trackCount: 25,
      totalDuration: 1500, // 25 minutes  
      category: "Release Radar",
      personalizationScore: 0.85,
    },
    {
      title: "On Repeat",
      description: "Songs you can't stop playing.",
      coverImage: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&h=300&fit=crop",
      trackCount: 30,
      totalDuration: 1920, // 32 minutes
      category: "On Repeat", 
      personalizationScore: 1.0,
    },
    {
      title: "Repeat Rewind",
      description: "Songs you loved and might want to hear again.",
      coverImage: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop&hue=180",
      trackCount: 30,
      totalDuration: 1800, // 30 minutes
      category: "Repeat Rewind",
      personalizationScore: 0.90,
    }
  ];

  try {
    for (const playlist of playlists) {
      await db.insert(madeForYouPlaylists).values(playlist);
    }
    console.log('✅ Made For You playlists seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding Made For You playlists:', error);
    throw error;
  }
};

// Run the seeding function if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedMadeForYouPlaylists();
}
