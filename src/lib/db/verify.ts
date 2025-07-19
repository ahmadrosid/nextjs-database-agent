import { getRecentlyPlayedSongs, getAllSongs } from './queries';

async function verify() {
  console.log('🔍 Verifying database...');
  
  try {
    const songs = await getAllSongs();
    console.log(`✅ Songs in database: ${songs.length}`);
    
    if (songs.length > 0) {
      console.log('   Sample song:', songs[0]);
    }
    
    const recentlyPlayed = await getRecentlyPlayedSongs('user-1', 5);
    console.log(`✅ Recently played entries: ${recentlyPlayed.length}`);
    
    if (recentlyPlayed.length > 0) {
      console.log('   Most recent:', recentlyPlayed[0]);
    }
    
    console.log('🎉 Database verification complete!');
    
  } catch (error) {
    console.error('❌ Database verification failed:', error);
  }
  
  process.exit(0);
}

verify();