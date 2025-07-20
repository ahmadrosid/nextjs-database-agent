import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recentlyPlayedSongs } from '@/lib/db/schema/songs';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema for creating new recently played songs
const CreateSongSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  artist: z.string().min(1, 'Artist is required'),
  album: z.string().optional(),
  duration: z.number().positive().optional(),
  albumArt: z.string().url().optional(),
  spotifyId: z.string().optional(),
  genre: z.string().optional(),
  year: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
  rating: z.number().min(1).max(5).optional(),
});

// GET: Fetch recently played songs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const songs = await db
      .select()
      .from(recentlyPlayedSongs)
      .orderBy(desc(recentlyPlayedSongs.playedAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      success: true,
      data: songs,
      meta: {
        total: songs.length,
        limit,
        offset
      }
    });
  } catch (error) {
    console.error('Error fetching recently played songs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recently played songs' },
      { status: 500 }
    );
  }
}

// POST: Add a new recently played song
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate the request body
    const validationResult = CreateSongSchema.safeParse(body);
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

    const songData = validationResult.data;

    // Check if song already exists recently (within last hour)
    const existingRecentSong = await db
      .select()
      .from(recentlyPlayedSongs)
      .where(eq(recentlyPlayedSongs.title, songData.title))
      .limit(1);

    let result;
    
    if (existingRecentSong.length > 0) {
      // Update existing song's play count and played_at time
      result = await db
        .update(recentlyPlayedSongs)
        .set({
          playCount: existingRecentSong[0].playCount + 1,
          playedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .where(eq(recentlyPlayedSongs.id, existingRecentSong[0].id))
        .returning();
    } else {
      // Insert new song
      result = await db
        .insert(recentlyPlayedSongs)
        .values({
          ...songData,
          playedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .returning();
    }

    return NextResponse.json({
      success: true,
      data: result[0],
      message: existingRecentSong.length > 0 ? 'Song play count updated' : 'Song added to recently played'
    }, { status: 201 });

  } catch (error) {
    console.error('Error adding recently played song:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add recently played song' },
      { status: 500 }
    );
  }
}