import { db } from './index';
import { popularAlbums } from './schema/albums';

export const seedPopularAlbums = async () => {
  const albums = [
    {
      title: "After Hours",
      artist: "The Weeknd",
      coverImage: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
      releaseDate: "2020-03-20",
      genre: "R&B/Soul",
      trackCount: 14,
      totalDuration: 3360, // 56 minutes
      popularityScore: 95.8,
      monthlyPlays: 125000000,
      totalPlays: 5500000000,
      averageRating: 4.6,
      label: "XO/Republic Records",
      chartPosition: 1,
      peakChartPosition: 1,
      isExplicit: true,
      isFeatured: true,
    },
    {
      title: "÷ (Divide)",
      artist: "Ed Sheeran",
      coverImage: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop",
      releaseDate: "2017-03-03",
      genre: "Pop",
      trackCount: 16,
      totalDuration: 2880, // 48 minutes
      popularityScore: 94.2,
      monthlyPlays: 98000000,
      totalPlays: 8200000000,
      averageRating: 4.7,
      label: "Asylum/Atlantic Records",
      chartPosition: 3,
      peakChartPosition: 1,
      isExplicit: false,
      isFeatured: true,
    },
    {
      title: "Future Nostalgia", 
      artist: "Dua Lipa",
      coverImage: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=400&fit=crop",
      releaseDate: "2020-03-27",
      genre: "Pop",
      trackCount: 11,
      totalDuration: 2232, // 37 minutes
      popularityScore: 93.5,
      monthlyPlays: 87000000,
      totalPlays: 4100000000,
      averageRating: 4.5,
      label: "Warner Records",
      chartPosition: 2,
      peakChartPosition: 2,
      isExplicit: false,
      isFeatured: true,
    },
    {
      title: "SOUR",
      artist: "Olivia Rodrigo", 
      coverImage: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop&sat=2",
      releaseDate: "2021-05-21",
      genre: "Alternative/Indie",
      trackCount: 11,
      totalDuration: 2040, // 34 minutes
      popularityScore: 96.1,
      monthlyPlays: 156000000,
      totalPlays: 3800000000,
      averageRating: 4.8,
      label: "Geffen Records",
      chartPosition: 1,
      peakChartPosition: 1,
      isExplicit: false,
      isFeatured: true,
    },
    {
      title: "Scorpion",
      artist: "Drake",
      coverImage: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=400&fit=crop",
      releaseDate: "2018-06-29", 
      genre: "Hip Hop/Rap",
      trackCount: 25,
      totalDuration: 5400, // 90 minutes
      popularityScore: 92.7,
      monthlyPlays: 145000000,
      totalPlays: 7900000000,
      averageRating: 4.3,
      label: "OVO Sound/Republic Records",
      chartPosition: 4,
      peakChartPosition: 1,
      isExplicit: true,
      isFeatured: false,
    },
    {
      title: "Fine Line",
      artist: "Harry Styles",
      coverImage: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop&hue=180",
      releaseDate: "2019-12-13",
      genre: "Pop Rock",
      trackCount: 12,
      totalDuration: 2782, // 46 minutes
      popularityScore: 91.4,
      monthlyPlays: 76000000,
      totalPlays: 3200000000,
      averageRating: 4.4,
      label: "Columbia Records",
      chartPosition: 5,
      peakChartPosition: 1,
      isExplicit: false,
      isFeatured: false,
    },
    {
      title: "Positions",
      artist: "Ariana Grande",
      coverImage: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop&sat=2",
      releaseDate: "2020-10-30",
      genre: "R&B/Pop",
      trackCount: 14,
      totalDuration: 2520, // 42 minutes
      popularityScore: 89.8,
      monthlyPlays: 92000000,
      totalPlays: 2800000000,
      averageRating: 4.2,
      label: "Republic Records",
      chartPosition: 6,
      peakChartPosition: 1,
      isExplicit: true,
      isFeatured: false,
    },
    {
      title: "Happier Than Ever",
      artist: "Billie Eilish",
      coverImage: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=400&fit=crop&sat=2",
      releaseDate: "2021-07-30",
      genre: "Alternative/Pop",
      trackCount: 16,
      totalDuration: 3360, // 56 minutes
      popularityScore: 94.6,
      monthlyPlays: 108000000,
      totalPlays: 2200000000,
      averageRating: 4.7,
      label: "Darkroom/Interscope Records",
      chartPosition: 2,
      peakChartPosition: 1,
      isExplicit: true,
      isFeatured: true,
    }
  ];

  try {
    for (const album of albums) {
      await db.insert(popularAlbums).values(album);
    }
    console.log('✅ Popular albums seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding popular albums:', error);
    throw error;
  }
};

// Run the seeding function if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedPopularAlbums();
}
