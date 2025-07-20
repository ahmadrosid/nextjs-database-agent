import { z } from 'zod';

// Re-export database types
export type { RecentlyPlayedSong, NewRecentlyPlayedSong } from '@/lib/db/schema/songs';

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: any;
}

export interface RecentlyPlayedResponse {
  success: boolean;
  data: RecentlyPlayedSong[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
}

// Form validation schemas
export const CreateSongFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  artist: z.string().min(1, 'Artist is required'),
  album: z.string().optional(),
  duration: z.number().positive().optional(),
  albumArt: z.string().url().optional(),
  spotifyId: z.string().optional(),
  genre: z.string().optional(),
  year: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
  rating: z.number().min(1).max(5).optional(),
});

export const UpdateSongFormSchema = z.object({
  rating: z.number().min(1).max(5).optional(),
  playCount: z.number().positive().optional(),
});

export type CreateSongForm = z.infer<typeof CreateSongFormSchema>;
export type UpdateSongForm = z.infer<typeof UpdateSongFormSchema>;

// Helper types
export interface SongWithMetadata extends RecentlyPlayedSong {
  isRecentlyAdded?: boolean;
  timeSinceLastPlayed?: string;
}