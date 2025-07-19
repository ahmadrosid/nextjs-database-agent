import { NextRequest, NextResponse } from 'next/server';
import { addSongAndPlay, getSongById } from '@/lib/db/queries';
import { z } from 'zod';

// POST: Add a song and mark it as recently played
const playSongSchema = z.object({
  id: z.string().min(1, 'Song ID is required'),
  title: z.string().min(1, 'Title is required'),
  artist: z.string().min(1, 'Artist is required'),
  album: z.string().min(1, 'Album is required'),
  albumArt: z.string().url('Album art must be a valid URL'),
  duration: z.number().int().positive('Duration must be a positive integer'),
  userId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validation = playSongSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validation.error.format() 
        },
        { status: 400 }
      );
    }

    const { userId, ...songData } = validation.data;

    // Add song and mark as played
    const result = await addSongAndPlay(songData, userId);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to play song' },
        { status: 500 }
      );
    }

    // Get the song data for response
    const song = await getSongById(songData.id);

    return NextResponse.json({
      message: 'Song played and added to recently played',
      song: song
    });
    
  } catch (error) {
    console.error('Error playing song:', error);
    return NextResponse.json(
      { error: 'Failed to play song' },
      { status: 500 }
    );
  }
}