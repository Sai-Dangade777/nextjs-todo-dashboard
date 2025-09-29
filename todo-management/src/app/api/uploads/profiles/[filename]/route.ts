import { NextRequest } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = params.filename
    const filepath = join(process.cwd(), 'uploads', 'profiles', filename)

    // Check if file exists
    if (!existsSync(filepath)) {
      return new Response('File not found', { status: 404 })
    }

    // Read the file
    const fileBuffer = await readFile(filepath)
    
    // Determine content type based on file extension
    const ext = filename.split('.').pop()?.toLowerCase()
    let contentType = 'image/png' // default
    
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg'
        break
      case 'png':
        contentType = 'image/png'
        break
      case 'gif':
        contentType = 'image/gif'
        break
      case 'webp':
        contentType = 'image/webp'
        break
    }

    // Return the file with appropriate headers
    return new Response(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      }
    })

  } catch (error) {
    console.error('Error serving profile picture:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}