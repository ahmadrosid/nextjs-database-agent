// Database types
export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  albumArt: string;
  duration: number; // in seconds
  createdAt?: Date;
}

export interface RecentlyPlayedSong extends Song {
  playedAt: Date;
}

// API Response types
export interface SongsResponse {
  data: Song[];
  count: number;
}

export interface RecentlyPlayedResponse {
  data: RecentlyPlayedSong[];
  count: number;
}

export interface PlaySongRequest {
  id: string;
  title: string;
  artist: string;
  album: string;
  albumArt: string;
  duration: number;
  userId?: string;
}

export interface AddRecentlyPlayedRequest {
  songId: string;
  userId?: string;
}

// API Response wrappers
export interface ApiResponse<T> {
  message?: string;
  error?: string;
  details?: any;
  data?: T;
}

export interface PlaySongResponse {
  message: string;
  song: Song;
}

// Legacy Track interface compatibility (from spotify-player.tsx)
export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  albumArt: string;
  duration: number;
}

// Convert between Song and Track interfaces
export function songToTrack(song: Song): Track {
  return {
    id: song.id,
    title: song.title,
    artist: song.artist,
    album: song.album,
    albumArt: song.albumArt,
    duration: song.duration,
  };
}

export function trackToSong(track: Track): Omit<Song, 'createdAt'> {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    album: track.album,
    albumArt: track.albumArt,
    duration: track.duration,
  };
}