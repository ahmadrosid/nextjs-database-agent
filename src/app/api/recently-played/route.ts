import { NextRequest, NextResponse } from 'next/server';
import { getRecentlyPlayedSongs, addRecentlyPlayedSong } from '@/lib/db/queries';
import { z } from 'zod';

// GET: Get recently played songs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 20;

    // Validate limit
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Invalid limit parameter. Must be between 1 and 100.' },
        { status: 400 }
      );
    }

    const recentlyPlayedSongs = await getRecentlyPlayedSongs(userId, limit);
    
    return NextResponse.json({
      data: recentlyPlayedSongs,
      count: recentlyPlayedSongs.length
    });
  } catch (error) {
    console.error('Error fetching recently played songs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recently played songs' },
      { status: 500 }
    );
  }
}

// POST: Add a song to recently played
const addRecentlyPlayedSchema = z.object({
  songId: z.string().min(1, 'Song ID is required'),
  userId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validation = addRecentlyPlayedSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validation.error.format() 
        },
        { status: 400 }
      );
    }

    const { songId, userId } = validation.data;

    // Add song to recently played
    const result = await addRecentlyPlayedSong(songId, userId);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to add song to recently played' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Song added to recently played successfully',
      songId
    });
    
  } catch (error) {
    console.error('Error adding song to recently played:', error);
    return NextResponse.json(
      { error: 'Failed to add song to recently played' },
      { status: 500 }
    );
  }
}