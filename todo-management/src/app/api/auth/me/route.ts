import { NextRequest } from 'next/server'
import { authenticateUser, createErrorResponse, createSuccessResponse } from '@/middleware/auth'
import prisma from '@/lib/db/prisma'

export async function GET(request: NextRequest) {
  try {
    const { isAuthenticated, user, error } = await authenticateUser(request)

    if (!isAuthenticated || !user) {
      return createErrorResponse(error || 'Unauthorized', 401)
    }

    // Fetch full user profile with stats
    const userProfile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        profilePic: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true
      }
    })

    if (!userProfile) {
      return createErrorResponse('User not found', 404)
    }

    return createSuccessResponse({
      user: userProfile,
      stats: {
        todosCreated: 0,
        todosAssigned: 0,
        filesUploaded: 0,
        unreadNotifications: 0
      }
    })

  } catch (error) {
    console.error('Get user profile error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}