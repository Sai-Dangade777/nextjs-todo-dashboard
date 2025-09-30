import { NextRequest } from 'next/server'
import { authenticateUser, createErrorResponse, createSuccessResponse } from '@/middleware/auth'
import prisma from '@/lib/db/prisma'

// GET /api/notifications - Get user notifications
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
    const unreadOnly = searchParams.get('unread') === 'true'

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = { userId: user.id }
    if (unreadOnly) {
      where.isRead = false
    }

    // Get notifications with pagination
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        include: {
          todo: {
            select: {
              id: true,
              title: true,
              status: true,
              dueDate: true,
              priority: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.notification.count({ where })
    ])

    const totalPages = Math.ceil(total / limit)

    return createSuccessResponse({
      notifications,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    })

  } catch (error) {
    console.error('Fetch notifications error:', error)
    return createErrorResponse('Failed to fetch notifications', 500)
  }
}

// POST /api/notifications - Create notification (internal use)
export async function POST(request: NextRequest) {
  try {
    const { isAuthenticated, user, error } = await authenticateUser(request)

    if (!isAuthenticated || !user) {
      return createErrorResponse(error || 'Unauthorized', 401)
    }

    const body = await request.json()
    const { userId, title, message, type, todoId, metadata } = body

    // Validate required fields
    if (!userId || !title || !message || !type) {
      return createErrorResponse('Missing required fields', 400)
    }

    // Create notification
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        todoId: todoId || null,
        metadata: metadata || null
      },
      include: {
        todo: {
          select: {
            id: true,
            title: true,
            status: true
          }
        }
      }
    })

    return createSuccessResponse({
      notification,
      message: 'Notification created successfully'
    })

  } catch (error) {
    console.error('Create notification error:', error)
    return createErrorResponse('Failed to create notification', 500)
  }
}