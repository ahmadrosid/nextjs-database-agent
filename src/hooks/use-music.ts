import { useState, useEffect } from 'react';
import type { 
  MadeForYouPlaylist, 
  PopularAlbum, 
  RecentlyPlayedSong,
  PaginatedResponse,
  MadeForYouQueryParams,
  PopularAlbumsQueryParams,
  RecentlyPlayedQueryParams
} from '@/types/music';

// Custom hook for Made for You playlists
export function useMadeForYou(params?: MadeForYouQueryParams) {
  const [playlists, setPlaylists] = useState<MadeForYouPlaylist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const fetchPlaylists = async () => {
    setLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams();
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.offset) searchParams.set('offset', params.offset.toString());
      if (params?.category) searchParams.set('category', params.category);
      if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
      if (params?.order) searchParams.set('order', params.order);

      const response = await fetch(`/api/made-for-you?${searchParams}`);
      const data: PaginatedResponse<MadeForYouPlaylist> = await response.json();

      if (data.success && data.data) {
        setPlaylists(data.data);
        setHasMore(data.pagination?.hasMore ?? false);
      } else {
        setError(data.error || 'Failed to fetch playlists');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylists();
  }, [JSON.stringify(params)]);

  return { playlists, loading, error, hasMore, refetch: fetchPlaylists };
}

// Custom hook for Popular Albums
export function usePopularAlbums(params?: PopularAlbumsQueryParams) {
  const [albums, setAlbums] = useState<PopularAlbum[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const fetchAlbums = async () => {
    setLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams();
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.offset) searchParams.set('offset', params.offset.toString());
      if (params?.genre) searchParams.set('genre', params.genre);
      if (params?.artist) searchParams.set('artist', params.artist);
      if (params?.isFeatured !== undefined) searchParams.set('isFeatured', params.isFeatured.toString());
      if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
      if (params?.order) searchParams.set('order', params.order);

      const response = await fetch(`/api/popular-albums?${searchParams}`);
      const data: PaginatedResponse<PopularAlbum> = await response.json();

      if (data.success && data.data) {
        setAlbums(data.data);
        setHasMore(data.pagination?.hasMore ?? false);
      } else {
        setError(data.error || 'Failed to fetch albums');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlbums();
  }, [JSON.stringify(params)]);

  return { albums, loading, error, hasMore, refetch: fetchAlbums };
}

// Custom hook for Recently Played Songs (already exists, but let's make it consistent)
export function useRecentlyPlayed(params?: RecentlyPlayedQueryParams) {
  const [songs, setSongs] = useState<RecentlyPlayedSong[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const fetchSongs = async () => {
    setLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams();
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.offset) searchParams.set('offset', params.offset.toString());
      if (params?.artist) searchParams.set('artist', params.artist);
      if (params?.album) searchParams.set('album', params.album);
      if (params?.genre) searchParams.set('genre', params.genre);
      if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
      if (params?.order) searchParams.set('order', params.order);

      const response = await fetch(`/api/recently-played?${searchParams}`);
      const data: PaginatedResponse<RecentlyPlayedSong> = await response.json();

      if (data.success && data.data) {
        setSongs(data.data);
        setHasMore(data.pagination?.hasMore ?? false);
      } else {
        setError(data.error || 'Failed to fetch songs');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSongs();
  }, [JSON.stringify(params)]);

  return { songs, loading, error, hasMore, refetch: fetchSongs };
}