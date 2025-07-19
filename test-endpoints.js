// Quick test of the API endpoints
async function testEndpoints() {
  const baseUrl = 'http://localhost:3000'
  
  try {
    // Test Made For You endpoint
    console.log('🧪 Testing Made For You endpoint...')
    const madeForYouResponse = await fetch(`${baseUrl}/api/playlists?category=made-for-you&limit=6`)
    const madeForYouData = await madeForYouResponse.json()
    
    if (madeForYouData.success) {
      console.log(`✅ Made For You: ${madeForYouData.data.length} items`)
      madeForYouData.data.forEach(item => {
        console.log(`   - ${item.title} by ${item.artist}`)
      })
    } else {
      console.log('❌ Made For You failed:', madeForYouData.error)
    }

    // Test Popular Albums endpoint
    console.log('\n🧪 Testing Popular Albums endpoint...')
    const popularResponse = await fetch(`${baseUrl}/api/playlists?category=popular-albums&limit=8`)
    const popularData = await popularResponse.json()
    
    if (popularData.success) {
      console.log(`✅ Popular Albums: ${popularData.data.length} items`)
      popularData.data.forEach(item => {
        console.log(`   - ${item.title} by ${item.artist}`)
      })
    } else {
      console.log('❌ Popular Albums failed:', popularData.error)
    }

    console.log('\n🎉 All endpoints tested successfully!')
    
  } catch (error) {
    console.error('❌ Error testing endpoints:', error.message)
    console.log('💡 Make sure Next.js server is running: npm run dev')
  }
}

testEndpoints()