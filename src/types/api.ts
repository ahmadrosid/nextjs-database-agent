// API Response types
export interface ApiResponse<T> {
  success: boolean
  data: T
  total?: number
  error?: string
  details?: any[]
}

// Category types
export interface Category {
  id: number
  name: string
  slug: string
  createdAt: Date
  playlistCount?: number
}

// Playlist types  
export interface Playlist {
  id: number
  externalId: string
  title: string
  artist: string
  album?: string | null
  image?: string | null
  duration?: number | null
  createdAt: Date
  category?: {
    id: number
    name: string
    slug: string
  } | null
}

// API response types
export type CategoriesResponse = ApiResponse<Category[]>
export type PlaylistsResponse = ApiResponse<Playlist[]>
export type PlaylistResponse = ApiResponse<Playlist>

// Query parameters
export interface PlaylistQuery {
  category?: string
  limit?: number
}

// Create playlist request
export interface CreatePlaylistRequest {
  externalId: string
  title: string
  artist: string
  album?: string
  image?: string
  duration?: number
  categorySlug: string
}