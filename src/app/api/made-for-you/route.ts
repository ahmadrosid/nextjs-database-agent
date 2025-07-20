import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { madeForYouPlaylists } from '@/lib/db/schema';
import { desc, asc, eq } from 'drizzle-orm';

// Validation schemas
const CreatePlaylistSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  coverImage: z.string().url().optional(),
  trackCount: z.number().min(0).default(0),
  totalDuration: z.number().min(0).default(0),
  category: z.string().min(1, 'Category is required'),
  personalizationScore: z.number().min(0).max(1).default(0),
  isActive: z.boolean().default(true),
  spotifyId: z.string().optional(),
});

const GetPlaylistsSchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 10),
  offset: z.string().optional().transform(val => val ? parseInt(val, 10) : 0),
  category: z.string().optional(),
  sortBy: z.enum(['personalizationScore', 'lastUpdated', 'title']).default('personalizationScore'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// GET /api/made-for-you - Fetch Made for You playlists
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const validatedParams = GetPlaylistsSchema.parse(queryParams);
    const { limit, offset, category, sortBy, order } = validatedParams;

    let query = db.select().from(madeForYouPlaylists);

    // Apply filters
    if (category) {
      query = query.where(eq(madeForYouPlaylists.category, category));
    }

    // Apply sorting
    const orderFn = order === 'desc' ? desc : asc;
    query = query.orderBy(orderFn(madeForYouPlaylists[sortBy]));

    // Apply pagination
    query = query.limit(limit).offset(offset);

    const playlists = await query;

    // Get total count for pagination
    const totalCount = await db.select().from(madeForYouPlaylists).then(rows => rows.length);

    return NextResponse.json({
      success: true,
      data: playlists,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid query parameters', 
          details: error.errors 
        },
        { status: 400 }
      );
    }

    console.error('Error fetching Made for You playlists:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch playlists' 
      },
      { status: 500 }
    );
  }
}

// POST /api/made-for-you - Create a new Made for You playlist
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = CreatePlaylistSchema.parse(body);

    const result = await db.insert(madeForYouPlaylists).values({
      ...validatedData,
      lastUpdated: new Date().toISOString(),
    }).returning();

    return NextResponse.json({
      success: true,
      data: result[0],
      message: 'Made for You playlist created successfully'
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid playlist data', 
          details: error.errors 
        },
        { status: 400 }
      );
    }

    console.error('Error creating Made for You playlist:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create playlist' 
      },
      { status: 500 }
    );
  }
}