import { NextRequest } from 'next/server'
import { authenticateUser, createErrorResponse, createSuccessResponse } from '@/middleware/auth'
import prisma from '@/lib/db/prisma'

// PUT /api/notifications/[id] - Mark notification as read
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { isAuthenticated, user, error } = await authenticateUser(request)

    if (!isAuthenticated || !user) {
      return createErrorResponse(error || 'Unauthorized', 401)
    }

    const notificationId = params.id
    const body = await request.json()
    const { isRead } = body

    // Find notification and verify ownership
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId }
    })

    if (!notification) {
      return createErrorResponse('Notification not found', 404)
    }

    if (notification.userId !== user.id) {
      return createErrorResponse('Access denied', 403)
    }

    // Update notification
    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: { 
        isRead: isRead !== undefined ? isRead : true,
        readAt: isRead !== false ? new Date() : null
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
      notification: updatedNotification,
      message: 'Notification updated successfully'
    })

  } catch (error) {
    console.error('Update notification error:', error)
    return createErrorResponse('Failed to update notification', 500)
  }
}

// DELETE /api/notifications/[id] - Delete notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { isAuthenticated, user, error } = await authenticateUser(request)

    if (!isAuthenticated || !user) {
      return createErrorResponse(error || 'Unauthorized', 401)
    }

    const notificationId = params.id

    // Find notification and verify ownership
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId }
    })

    if (!notification) {
      return createErrorResponse('Notification not found', 404)
    }

    if (notification.userId !== user.id) {
      return createErrorResponse('Access denied', 403)
    }

    // Delete notification
    await prisma.notification.delete({
      where: { id: notificationId }
    })

    return createSuccessResponse({
      message: 'Notification deleted successfully'
    })

  } catch (error) {
    console.error('Delete notification error:', error)
    return createErrorResponse('Failed to delete notification', 500)
  }
}