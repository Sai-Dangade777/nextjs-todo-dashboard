import { NextRequest } from 'next/server'
import { authenticateUser, createErrorResponse, createSuccessResponse } from '@/middleware/auth'
import prisma from '@/lib/db/prisma'
import { unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { isAuthenticated, user, error } = await authenticateUser(request)

    if (!isAuthenticated || !user) {
      return createErrorResponse(error || 'Unauthorized', 401)
    }

    const fileId = params.id

    // Find file and verify ownership/access
    const file = await prisma.file.findUnique({
      where: { id: fileId },
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
      return createErrorResponse('File not found', 404)
    }

    // Check permissions
    const canDelete = file.uploadedById === user.id ||
                     (file.todo && (file.todo.creatorId === user.id || file.todo.assigneeId === user.id))

    if (!canDelete) {
      return createErrorResponse('Access denied', 403)
    }

    // Delete file from database first
    await prisma.file.delete({
      where: { id: fileId }
    })

    // Delete file from filesystem
    const filePath = path.join('./uploads', file.fileName)
    try {
      if (existsSync(filePath)) {
        await unlink(filePath)
      }
    } catch (fsError) {
      console.error('Error deleting file from disk:', fsError)
      // Continue - database record is already deleted
    }

    return createSuccessResponse({
      message: 'File deleted successfully'
    })

  } catch (error) {
    console.error('Delete file error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { isAuthenticated, user, error } = await authenticateUser(request)

    if (!isAuthenticated || !user) {
      return createErrorResponse(error || 'Unauthorized', 401)
    }

    const fileId = params.id

    // Find file and verify access
    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        OR: [
          { uploadedById: user.id },
          {
            todo: {
              OR: [
                { creatorId: user.id },
                { assigneeId: user.id }
              ]
            }
          }
        ]
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        todo: {
          select: {
            id: true,
            title: true,
            status: true
          }
        }
      }
    })

    if (!file) {
      return createErrorResponse('File not found or access denied', 404)
    }

    const formatFileSize = (bytes: number): string => {
      if (bytes === 0) return '0 Bytes'
      
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    return createSuccessResponse({
      ...file,
      url: `/api/files/serve/${file.fileName}`,
      sizeFormatted: formatFileSize(file.fileSize),
      isImage: file.mimeType.startsWith('image/')
    })

  } catch (error) {
    console.error('Get file error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}