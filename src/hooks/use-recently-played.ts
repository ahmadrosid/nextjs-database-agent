import { useState, useEffect } from 'react';
import { RecentlyPlayedSong, ApiResponse, RecentlyPlayedResponse, CreateSongForm } from '@/types/songs';

export function useRecentlyPlayed() {
  const [songs, setSongs] = useState<RecentlyPlayedSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch recently played songs
  const fetchSongs = async (limit = 20, offset = 0) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/recently-played?limit=${limit}&offset=${offset}`);
      const data: RecentlyPlayedResponse = await response.json();
      
      if (data.success) {
        setSongs(data.data);
      } else {
        setError(data.error || 'Failed to fetch songs');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Add a new song to recently played
  const addSong = async (songData: CreateSongForm): Promise<RecentlyPlayedSong | null> => {
    try {
      const response = await fetch('/api/recently-played', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(songData),
      });

      const data: ApiResponse<RecentlyPlayedSong> = await response.json();
      
      if (data.success && data.data) {
        // Refresh the songs list
        fetchSongs();
        return data.data;
      } else {
        setError(data.error || 'Failed to add song');
        return null;
      }
    } catch (err) {
      setError('Network error occurred');
      return null;
    }
  };

  // Update a song's rating
  const updateSongRating = async (id: number, rating: number): Promise<boolean> => {
    try {
      const response = await fetch(`/api/recently-played/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rating }),
      });

      const data: ApiResponse<RecentlyPlayedSong> = await response.json();
      
      if (data.success) {
        // Refresh the songs list
        fetchSongs();
        return true;
      } else {
        setError(data.error || 'Failed to update rating');
        return false;
      }
    } catch (err) {
      setError('Network error occurred');
      return false;
    }
  };

  // Delete a song from recently played
  const deleteSong = async (id: number): Promise<boolean> => {
    try {
      const response = await fetch(`/api/recently-played/${id}`, {
        method: 'DELETE',
      });

      const data: ApiResponse<null> = await response.json();
      
      if (data.success) {
        // Refresh the songs list
        fetchSongs();
        return true;
      } else {
        setError(data.error || 'Failed to delete song');
        return false;
      }
    } catch (err) {
      setError('Network error occurred');
      return false;
    }
  };

  // Load songs on mount
  useEffect(() => {
    fetchSongs();
  }, []);

  return {
    songs,
    loading,
    error,
    fetchSongs,
    addSong,
    updateSongRating,
    deleteSong,
    refetch: fetchSongs,
  };
}