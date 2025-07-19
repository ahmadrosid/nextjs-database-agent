import { NextRequest, NextResponse } from 'next/server';
import { getAllSongs, addSong } from '@/lib/db/queries';
import { z } from 'zod';

// GET: Get all songs
export async function GET() {
  try {
    const songs = await getAllSongs();
    return NextResponse.json({
      data: songs,
      count: songs.length
    });
  } catch (error) {
    console.error('Error fetching songs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch songs' },
      { status: 500 }
    );
  }
}

// POST: Add a new song
const addSongSchema = z.object({
  id: z.string().min(1, 'Song ID is required'),
  title: z.string().min(1, 'Title is required'),
  artist: z.string().min(1, 'Artist is required'),
  album: z.string().min(1, 'Album is required'),
  albumArt: z.string().url('Album art must be a valid URL'),
  duration: z.number().int().positive('Duration must be a positive integer'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validation = addSongSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validation.error.format() 
        },
        { status: 400 }
      );
    }

    const songData = validation.data;

    // Add song to database
    const result = await addSong(songData);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to add song' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Song added successfully',
      song: songData
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error adding song:', error);
    return NextResponse.json(
      { error: 'Failed to add song' },
      { status: 500 }
    );
  }
}