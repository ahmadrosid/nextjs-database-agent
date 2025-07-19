import { NextRequest, NextResponse } from 'next/server'
import { db, playlists, categories } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

// Validation schemas
const playlistQuerySchema = z.object({
  category: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = playlistQuerySchema.parse({
      category: searchParams.get('category'),
      limit: searchParams.get('limit'),
    })

    let playlistsQuery = db
      .select({
        id: playlists.id,
        externalId: playlists.externalId,
        title: playlists.title,
        artist: playlists.artist,
        album: playlists.album,
        image: playlists.image,
        duration: playlists.duration,
        createdAt: playlists.createdAt,
        category: {
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
        },
      })
      .from(playlists)
      .leftJoin(categories, eq(playlists.categoryId, categories.id))

    // Filter by category if provided
    if (query.category) {
      playlistsQuery = playlistsQuery.where(eq(categories.slug, query.category))
    }

    const results = await playlistsQuery.limit(query.limit)

    return NextResponse.json({
      success: true,
      data: results,
      total: results.length,
    })
  } catch (error) {
    console.error('API Error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch playlists',
      },
      { status: 500 }
    )
  }
}

// POST route to add new playlists
const createPlaylistSchema = z.object({
  externalId: z.string(),
  title: z.string().min(1),
  artist: z.string().min(1),
  album: z.string().optional(),
  image: z.string().url().optional(),
  duration: z.number().positive().optional(),
  categorySlug: z.string(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = createPlaylistSchema.parse(body)

    // Find the category
    const category = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, data.categorySlug))
      .limit(1)

    if (!category.length) {
      return NextResponse.json(
        {
          success: false,
          error: `Category '${data.categorySlug}' not found`,
        },
        { status: 400 }
      )
    }

    // Create the playlist
    const newPlaylist = await db
      .insert(playlists)
      .values({
        externalId: data.externalId,
        title: data.title,
        artist: data.artist,
        album: data.album,
        image: data.image,
        duration: data.duration,
        categoryId: category[0].id,
      })
      .returning()

    return NextResponse.json(
      {
        success: true,
        data: newPlaylist[0],
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('API Error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create playlist',
      },
      { status: 500 }
    )
  }
}