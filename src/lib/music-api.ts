import type { 
  Song, 
  RecentlyPlayedSong, 
  SongsResponse, 
  RecentlyPlayedResponse,
  PlaySongRequest,
  AddRecentlyPlayedRequest,
  ApiResponse,
  PlaySongResponse,
  Track
} from '@/types/music';

// Base API URL
const BASE_URL = '/api';

// API client functions
export class MusicAPI {
  
  // Get all songs
  static async getAllSongs(): Promise<Song[]> {
    try {
      const response = await fetch(`${BASE_URL}/songs`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: SongsResponse = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching songs:', error);
      throw error;
    }
  }
  
  // Get recently played songs
  static async getRecentlyPlayed(userId?: string, limit: number = 20): Promise<RecentlyPlayedSong[]> {
    try {
      const params = new URLSearchParams();
      if (userId) params.append('userId', userId);
      if (limit) params.append('limit', limit.toString());
      
      const url = `${BASE_URL}/recently-played?${params.toString()}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: RecentlyPlayedResponse = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching recently played:', error);
      throw error;
    }
  }
  
  // Add a song to recently played
  static async addRecentlyPlayed(songId: string, userId?: string): Promise<void> {
    try {
      const body: AddRecentlyPlayedRequest = { songId, userId };
      
      const response = await fetch(`${BASE_URL}/recently-played`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
      }
      
    } catch (error) {
      console.error('Error adding recently played:', error);
      throw error;
    }
  }
  
  // Play a song (add to catalog and mark as recently played)
  static async playSong(songData: PlaySongRequest): Promise<Song> {
    try {
      const response = await fetch(`${BASE_URL}/songs/play`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(songData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
      }
      
      const data: PlaySongResponse = await response.json();
      return data.song;
    } catch (error) {
      console.error('Error playing song:', error);
      throw error;
    }
  }
  
  // Add a new song to catalog
  static async addSong(songData: Omit<Song, 'createdAt'>): Promise<Song> {
    try {
      const response = await fetch(`${BASE_URL}/songs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(songData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.song;
    } catch (error) {
      console.error('Error adding song:', error);
      throw error;
    }
  }
}

// Utility functions for Spotify Player integration
export async function trackRecentlyPlayed(track: Track, userId?: string) {
  try {
    // Play the song (this will add it to catalog if needed and mark as recently played)
    await MusicAPI.playSong({
      ...track,
      userId,
    });
  } catch (error) {
    console.error('Failed to track recently played song:', error);
    // Don't throw - this shouldn't break music playback
  }
}

// Format time helper (you can use this in components)
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Convert recently played to Track format for compatibility
export function recentlyPlayedToTracks(recentlyPlayed: RecentlyPlayedSong[]): Track[] {
  return recentlyPlayed.map(song => ({
    id: song.id,
    title: song.title,
    artist: song.artist,
    album: song.album,
    albumArt: song.albumArt,
    duration: song.duration,
  }));
}