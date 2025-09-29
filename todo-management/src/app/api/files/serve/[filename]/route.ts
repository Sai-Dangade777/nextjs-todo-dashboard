import { NextRequest } from 'next/server'
import { authenticateUser, createErrorResponse } from '@/middleware/auth'
import prisma from '@/lib/db/prisma'
import { readFile } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const { isAuthenticated, user, error } = await authenticateUser(request)

    if (!isAuthenticated || !user) {
      return createErrorResponse(error || 'Unauthorized', 401)
    }

    const filename = params.filename

    // Find file in database to verify ownership/access
    const file = await prisma.file.findFirst({
      where: {
        fileName: filename,
        OR: [
          { uploadedById: user.id }, // User uploaded the file
          {
            todo: {
              OR: [
                { creatorId: user.id }, // User created the todo
                { assigneeId: user.id } // User is assigned to the todo
              ]
            }
          }
        ]
      },
      include: {
        todo: {
          select: {
            id: true,
            creatorId: true,
            assigneeId: true
          }
        }
      }
    })

    if (!file) {
      return createErrorResponse('File not found or access denied', 404)
    }

    // Check if file exists on disk
    const filePath = path.join('./uploads', filename)
    
    if (!existsSync(filePath)) {
      console.error(`File not found on disk: ${filePath}`)
      return createErrorResponse('File not found on server', 404)
    }

    // Read file from disk
    const fileBuffer = await readFile(filePath)

    // Set appropriate headers
    const headers = new Headers()
    headers.set('Content-Type', file.mimeType)
    headers.set('Content-Length', file.fileSize.toString())
    headers.set('Content-Disposition', `inline; filename="${file.originalName}"`)
    
    // Add cache control for images
    if (file.mimeType.startsWith('image/')) {
      headers.set('Cache-Control', 'public, max-age=31536000') // 1 year
    }

    return new Response(fileBuffer as any, {
      status: 200,
      headers
    })

  } catch (error) {
    console.error('File serve error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}