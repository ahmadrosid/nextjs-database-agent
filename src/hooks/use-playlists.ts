'use client'

import { useState, useEffect } from 'react'
import type { PlaylistsResponse, PlaylistQuery, Playlist } from '@/types/api'

export function usePlaylists(query?: PlaylistQuery) {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPlaylists() {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams()
        if (query?.category) {
          params.append('category', query.category)
        }
        if (query?.limit) {
          params.append('limit', query.limit.toString())
        }

        const response = await fetch(`/api/playlists?${params.toString()}`)
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result: PlaylistsResponse = await response.json()
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch playlists')
        }

        setPlaylists(result.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        console.error('Error fetching playlists:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPlaylists()
  }, [query?.category, query?.limit])

  return {
    playlists,
    loading,
    error,
    refetch: () => {
      setLoading(true)
      setError(null)
      // Re-trigger the effect
      const event = new CustomEvent('refetch-playlists')
      window.dispatchEvent(event)
    }
  }
}