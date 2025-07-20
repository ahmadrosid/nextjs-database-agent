import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { popularAlbums } from '@/lib/db/schema';
import { desc, asc, eq, like } from 'drizzle-orm';

// Validation schemas
const CreateAlbumSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  artist: z.string().min(1, 'Artist is required'),
  coverImage: z.string().url().optional(),
  releaseDate: z.string().optional(),
  genre: z.string().optional(),
  trackCount: z.number().min(0).default(0),
  totalDuration: z.number().min(0).default(0),
  popularityScore: z.number().min(0).max(100).default(0),
  monthlyPlays: z.number().min(0).default(0),
  totalPlays: z.number().min(0).default(0),
  averageRating: z.number().min(1).max(5).optional(),
  label: z.string().optional(),
  spotifyId: z.string().optional(),
  chartPosition: z.number().min(1).optional(),
  peakChartPosition: z.number().min(1).optional(),
  isExplicit: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
});

const GetAlbumsSchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
  offset: z.string().optional().transform(val => val ? parseInt(val, 10) : 0),
  genre: z.string().optional(),
  artist: z.string().optional(),
  isFeatured: z.string().optional().transform(val => val === 'true'),
  sortBy: z.enum(['popularityScore', 'totalPlays', 'monthlyPlays', 'averageRating', 'releaseDate', 'title']).default('popularityScore'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// GET /api/popular-albums - Fetch popular albums
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const validatedParams = GetAlbumsSchema.parse(queryParams);
    const { limit, offset, genre, artist, isFeatured, sortBy, order } = validatedParams;

    let query = db.select().from(popularAlbums);

    // Apply filters
    if (genre) {
      query = query.where(like(popularAlbums.genre, `%${genre}%`));
    }
    
    if (artist) {
      query = query.where(like(popularAlbums.artist, `%${artist}%`));
    }

    if (isFeatured !== undefined) {
      query = query.where(eq(popularAlbums.isFeatured, isFeatured));
    }

    // Apply sorting
    const orderFn = order === 'desc' ? desc : asc;
    query = query.orderBy(orderFn(popularAlbums[sortBy]));

    // Apply pagination
    query = query.limit(limit).offset(offset);

    const albums = await query;

    // Get total count for pagination
    const totalCount = await db.select().from(popularAlbums).then(rows => rows.length);

    return NextResponse.json({
      success: true,
      data: albums,
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

    console.error('Error fetching popular albums:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch albums' 
      },
      { status: 500 }
    );
  }
}

// POST /api/popular-albums - Create a new popular album
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = CreateAlbumSchema.parse(body);

    const result = await db.insert(popularAlbums).values(validatedData).returning();

    return NextResponse.json({
      success: true,
      data: result[0],
      message: 'Popular album created successfully'
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid album data', 
          details: error.errors 
        },
        { status: 400 }
      );
    }

    console.error('Error creating popular album:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create album' 
      },
      { status: 500 }
    );
  }
}