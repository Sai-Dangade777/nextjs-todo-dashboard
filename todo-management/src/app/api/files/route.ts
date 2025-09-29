import { NextRequest } from 'next/server'
import { authenticateUser, createErrorResponse, createSuccessResponse } from '@/middleware/auth'
import prisma from '@/lib/db/prisma'
import { writeFile } from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB
const UPLOAD_DIR = './uploads'

export async function POST(request: NextRequest) {
  try {
    const { isAuthenticated, user, error } = await authenticateUser(request)

    if (!isAuthenticated || !user) {
      return createErrorResponse(error || 'Unauthorized', 401)
    }

    const formData = await request.formData()
    const todoId = formData.get('todoId') as string
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return createErrorResponse('No files provided', 400)
    }

    // Validate file count
    if (files.length > 5) {
      return createErrorResponse('Maximum 5 files allowed per upload', 400)
    }

    // If todoId is provided, verify user can access the todo
    if (todoId) {
      const todo = await prisma.todo.findUnique({
        where: { id: todoId },
        select: {
          id: true,
          creatorId: true,
          assigneeId: true
        }
      })

      if (!todo) {
        return createErrorResponse('Todo not found', 404)
      }

      // Check if user can upload files to this todo
      if (todo.creatorId !== user.id && todo.assigneeId !== user.id) {
        return createErrorResponse('Access denied', 403)
      }
    }

    const uploadedFiles: any[] = []
    const errors: string[] = []

    // Process each file
    for (const file of files) {
      try {
        // Validate file
        if (file.size === 0) {
          errors.push(`Empty file: ${file.name}`)
          continue
        }

        if (file.size > MAX_FILE_SIZE) {
          errors.push(`File too large: ${file.name} (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`)
          continue
        }

        // Validate file type
        const allowedTypes = [
          'image/jpeg', 'image/png', 'image/gif', 'image/webp',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain', 'text/csv',
          'application/zip', 'application/x-zip-compressed'
        ]

        if (!allowedTypes.includes(file.type)) {
          errors.push(`File type not allowed: ${file.name} (${file.type})`)
          continue
        }

        // Generate unique filename
        const fileExtension = path.extname(file.name)
        const uniqueFileName = `${uuidv4()}_${Date.now()}${fileExtension}`
        const filePath = path.join(UPLOAD_DIR, uniqueFileName)

        // Convert file to buffer and save
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Ensure upload directory exists
        const fs = await import('fs')
        if (!fs.existsSync(UPLOAD_DIR)) {
          fs.mkdirSync(UPLOAD_DIR, { recursive: true })
        }

        await writeFile(filePath, buffer)

        // Save file info to database
        const fileRecord = await prisma.file.create({
          data: {
            fileName: uniqueFileName,
            originalName: file.name,
            filePath: filePath,
            fileSize: file.size,
            mimeType: file.type,
            uploadedById: user.id,
            todoId: todoId || null
          },
          include: {
            uploadedBy: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        })

        uploadedFiles.push({
          ...fileRecord,
          url: `/api/files/serve/${uniqueFileName}`,
          sizeFormatted: formatFileSize(fileRecord.fileSize)
        })

      } catch (fileError) {
        console.error(`Error processing file ${file.name}:`, fileError)
        errors.push(`Failed to upload: ${file.name}`)
      }
    }

    if (uploadedFiles.length === 0) {
      return createErrorResponse(
        errors.length > 0 ? errors.join('; ') : 'No files were uploaded',
        400
      )
    }

    const response: any = {
      files: uploadedFiles,
      message: `${uploadedFiles.length} file(s) uploaded successfully`
    }

    if (errors.length > 0) {
      response.warnings = errors
    }

    return createSuccessResponse(response, 201)

  } catch (error) {
    console.error('File upload error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// GET /api/files - List files
export async function GET(request: NextRequest) {
  try {
    const { isAuthenticated, user, error } = await authenticateUser(request)

    if (!isAuthenticated || !user) {
      return createErrorResponse(error || 'Unauthorized', 401)
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const todoId = searchParams.get('todoId')
    const search = searchParams.get('search') || ''

    const skip = (page - 1) * limit

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      uploadedById: user.id // Users can only see their own files
    }

    if (todoId) {
      where.todoId = todoId
    }

    if (search) {
      where.originalName = {
        contains: search,
        mode: 'insensitive'
      }
    }

    const [files, total] = await Promise.all([
      prisma.file.findMany({
        where,
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
        },
        skip,
        take: limit,
        orderBy: { uploadedAt: 'desc' }
      }),
      prisma.file.count({ where })
    ])

    const filesWithUrls = files.map((file: any) => ({
      ...file,
      url: `/api/files/serve/${file.fileName}`,
      sizeFormatted: formatFileSize(file.fileSize),
      isImage: file.mimeType.startsWith('image/')
    }))

    return createSuccessResponse({
      files: filesWithUrls,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Get files error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}