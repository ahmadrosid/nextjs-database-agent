import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recentlyPlayedSongs } from '@/lib/db/schema/songs';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const UpdateSongSchema = z.object({
  rating: z.number().min(1).max(5).optional(),
  playCount: z.number().positive().optional(),
});

// GET: Fetch a specific recently played song
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid song ID' },
        { status: 400 }
      );
    }

    const song = await db
      .select()
      .from(recentlyPlayedSongs)
      .where(eq(recentlyPlayedSongs.id, id))
      .limit(1);

    if (song.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Song not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: song[0]
    });
  } catch (error) {
    console.error('Error fetching song:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch song' },
      { status: 500 }
    );
  }
}

// PATCH: Update a recently played song (rating, play count)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid song ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validationResult = UpdateSongSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const updateData = {
      ...validationResult.data,
      updatedAt: new Date().toISOString()
    };

    const result = await db
      .update(recentlyPlayedSongs)
      .set(updateData)
      .where(eq(recentlyPlayedSongs.id, id))
      .returning();

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Song not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result[0],
      message: 'Song updated successfully'
    });

  } catch (error) {
    console.error('Error updating song:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update song' },
      { status: 500 }
    );
  }
}

// DELETE: Remove a song from recently played
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid song ID' },
        { status: 400 }
      );
    }

    const result = await db
      .delete(recentlyPlayedSongs)
      .where(eq(recentlyPlayedSongs.id, id))
      .returning();

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Song not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Song removed from recently played'
    });

  } catch (error) {
    console.error('Error deleting song:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete song' },
      { status: 500 }
    );
  }
}