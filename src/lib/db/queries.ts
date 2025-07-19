import { db } from './index';
import { songs, recentlyPlayed } from './schema';
import { eq, desc, and } from 'drizzle-orm';
import type { Song, NewSong } from './schema';

// Recently played queries
export async function getRecentlyPlayedSongs(userId?: string, limit: number = 20) {
  const whereClause = userId 
    ? and(eq(recentlyPlayed.userId, userId))
    : undefined;

  const result = await db
    .select({
      id: songs.id,
      title: songs.title,
      artist: songs.artist,
      album: songs.album,
      albumArt: songs.albumArt,
      duration: songs.duration,
      playedAt: recentlyPlayed.playedAt,
    })
    .from(recentlyPlayed)
    .innerJoin(songs, eq(recentlyPlayed.songId, songs.id))
    .where(whereClause)
    .orderBy(desc(recentlyPlayed.playedAt))
    .limit(limit);

  return result;
}

export async function addRecentlyPlayedSong(songId: string, userId?: string) {
  try {
    await db.insert(recentlyPlayed).values({
      songId,
      playedAt: new Date(),
      userId: userId || 'user-1',
    });
    return { success: true };
  } catch (error) {
    console.error('Error adding recently played song:', error);
    return { success: false, error };
  }
}

// Song queries
export async function getAllSongs() {
  return await db.select().from(songs);
}

export async function getSongById(songId: string) {
  const result = await db
    .select()
    .from(songs)
    .where(eq(songs.id, songId))
    .limit(1);
  
  return result[0] || null;
}

export async function addSong(song: NewSong) {
  try {
    await db.insert(songs).values(song);
    return { success: true };
  } catch (error) {
    console.error('Error adding song:', error);
    return { success: false, error };
  }
}

export async function addSongAndPlay(song: NewSong, userId?: string) {
  try {
    // Add song if it doesn't exist
    await db.insert(songs).values(song).onConflictDoNothing();
    
    // Add to recently played
    await addRecentlyPlayedSong(song.id, userId);
    
    return { success: true };
  } catch (error) {
    console.error('Error adding song and playing:', error);
    return { success: false, error };
  }
}

// Clear old recently played entries (optional maintenance)
export async function clearOldRecentlyPlayed(daysToKeep: number = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  await db
    .delete(recentlyPlayed)
    .where(eq(recentlyPlayed.playedAt, cutoffDate));
}