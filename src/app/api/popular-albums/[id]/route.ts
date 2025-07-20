import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { popularAlbums } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const UpdateAlbumSchema = z.object({
  title: z.string().min(1).optional(),
  artist: z.string().min(1).optional(),
  coverImage: z.string().url().optional(),
  releaseDate: z.string().optional(),
  genre: z.string().optional(),
  trackCount: z.number().min(0).optional(),
  totalDuration: z.number().min(0).optional(),
  popularityScore: z.number().min(0).max(100).optional(),
  monthlyPlays: z.number().min(0).optional(),
  totalPlays: z.number().min(0).optional(),
  averageRating: z.number().min(1).max(5).optional(),
  label: z.string().optional(),
  spotifyId: z.string().optional(),
  chartPosition: z.number().min(1).optional(),
  peakChartPosition: z.number().min(1).optional(),
  isExplicit: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

// GET /api/popular-albums/[id] - Get specific album
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid album ID' },
        { status: 400 }
      );
    }

    const album = await db
      .select()
      .from(popularAlbums)
      .where(eq(popularAlbums.id, id))
      .limit(1);

    if (album.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Album not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: album[0]
    });

  } catch (error) {
    console.error('Error fetching album:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch album' },
      { status: 500 }
    );
  }
}

// PATCH /api/popular-albums/[id] - Update album
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid album ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = UpdateAlbumSchema.parse(body);

    // Check if album exists
    const existingAlbum = await db
      .select()
      .from(popularAlbums)
      .where(eq(popularAlbums.id, id))
      .limit(1);

    if (existingAlbum.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Album not found' },
        { status: 404 }
      );
    }

    const result = await db
      .update(popularAlbums)
      .set({
        ...validatedData,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(popularAlbums.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      data: result[0],
      message: 'Album updated successfully'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid album data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating album:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update album' },
      { status: 500 }
    );
  }
}

// DELETE /api/popular-albums/[id] - Delete album
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid album ID' },
        { status: 400 }
      );
    }

    // Check if album exists
    const existingAlbum = await db
      .select()
      .from(popularAlbums)
      .where(eq(popularAlbums.id, id))
      .limit(1);

    if (existingAlbum.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Album not found' },
        { status: 404 }
      );
    }

    await db
      .delete(popularAlbums)
      .where(eq(popularAlbums.id, id));

    return NextResponse.json({
      success: true,
      message: 'Album deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting album:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete album' },
      { status: 500 }
    );
  }
}