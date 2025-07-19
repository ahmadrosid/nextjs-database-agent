import { NextResponse } from 'next/server'
import { db, categories, playlists } from '@/lib/db'
import { eq, count } from 'drizzle-orm'

export async function GET() {
  try {
    const categoriesWithCounts = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        createdAt: categories.createdAt,
        playlistCount: count(playlists.id),
      })
      .from(categories)
      .leftJoin(playlists, eq(categories.id, playlists.categoryId))
      .groupBy(categories.id)

    return NextResponse.json({
      success: true,
      data: categoriesWithCounts,
    })
  } catch (error) {
    console.error('API Error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch categories',
      },
      { status: 500 }
    )
  }
}