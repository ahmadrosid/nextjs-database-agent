import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { madeForYouPlaylists } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const UpdatePlaylistSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  coverImage: z.string().url().optional(),
  trackCount: z.number().min(0).optional(),
  totalDuration: z.number().min(0).optional(),
  category: z.string().min(1).optional(),
  personalizationScore: z.number().min(0).max(1).optional(),
  isActive: z.boolean().optional(),
  spotifyId: z.string().optional(),
});

// GET /api/made-for-you/[id] - Get specific playlist
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid playlist ID' },
        { status: 400 }
      );
    }

    const playlist = await db
      .select()
      .from(madeForYouPlaylists)
      .where(eq(madeForYouPlaylists.id, id))
      .limit(1);

    if (playlist.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Playlist not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: playlist[0]
    });

  } catch (error) {
    console.error('Error fetching playlist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch playlist' },
      { status: 500 }
    );
  }
}

// PATCH /api/made-for-you/[id] - Update playlist
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid playlist ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = UpdatePlaylistSchema.parse(body);

    // Check if playlist exists
    const existingPlaylist = await db
      .select()
      .from(madeForYouPlaylists)
      .where(eq(madeForYouPlaylists.id, id))
      .limit(1);

    if (existingPlaylist.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Playlist not found' },
        { status: 404 }
      );
    }

    const result = await db
      .update(madeForYouPlaylists)
      .set({
        ...validatedData,
        lastUpdated: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(madeForYouPlaylists.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      data: result[0],
      message: 'Playlist updated successfully'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid playlist data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating playlist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update playlist' },
      { status: 500 }
    );
  }
}

// DELETE /api/made-for-you/[id] - Delete playlist
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid playlist ID' },
        { status: 400 }
      );
    }

    // Check if playlist exists
    const existingPlaylist = await db
      .select()
      .from(madeForYouPlaylists)
      .where(eq(madeForYouPlaylists.id, id))
      .limit(1);

    if (existingPlaylist.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Playlist not found' },
        { status: 404 }
      );
    }

    await db
      .delete(madeForYouPlaylists)
      .where(eq(madeForYouPlaylists.id, id));

    return NextResponse.json({
      success: true,
      message: 'Playlist deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting playlist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete playlist' },
      { status: 500 }
    );
  }
}