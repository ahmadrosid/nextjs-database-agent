import { db } from './src/lib/db/index.js';
import { madeForYouPlaylists, popularAlbums } from './src/lib/db/schema/index.js';

async function checkData() {
  console.log('Made for you playlists:');
  const playlists = await db.select().from(madeForYouPlaylists);
  console.log(playlists);
  
  console.log('\nPopular albums:');
  const albums = await db.select().from(popularAlbums);
  console.log(albums);
}

checkData();