// Export database types for frontend use
export type {
  MadeForYouPlaylist,
  NewMadeForYouPlaylist,
  PopularAlbum,
  NewPopularAlbum,
  RecentlyPlayedSong,
  NewRecentlyPlayedSong
} from '@/lib/db/schema';

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: any;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// Query parameter types
export interface MadeForYouQueryParams {
  limit?: number;
  offset?: number;
  category?: string;
  sortBy?: 'personalizationScore' | 'lastUpdated' | 'title';
  order?: 'asc' | 'desc';
}

export interface PopularAlbumsQueryParams {
  limit?: number;
  offset?: number;
  genre?: string;
  artist?: string;
  isFeatured?: boolean;
  sortBy?: 'popularityScore' | 'totalPlays' | 'monthlyPlays' | 'averageRating' | 'releaseDate' | 'title';
  order?: 'asc' | 'desc';
}

export interface RecentlyPlayedQueryParams {
  limit?: number;
  offset?: number;
  artist?: string;
  album?: string;
  genre?: string;
  sortBy?: 'playedAt' | 'playCount' | 'rating' | 'title';
  order?: 'asc' | 'desc';
}