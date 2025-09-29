import { NextRequest } from 'next/server'
import { authenticateUser, createErrorResponse, createSuccessResponse, requireAdmin, canAccessUser } from '@/middleware/auth'
import prisma from '@/lib/db/prisma'
import { UpdateUserRequest } from '@/types'

// GET /api/users/[id] - Get specific user
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { isAuthenticated, user, error } = await authenticateUser(request)

    if (!isAuthenticated || !user) {
      return createErrorResponse(error || 'Unauthorized', 401)
    }

    const targetUserId = params.id

    // Check if user can access this profile
    if (!canAccessUser(user, targetUserId)) {
      return createErrorResponse('Access denied', 403)
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
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

    if (!targetUser) {
      return createErrorResponse('User not found', 404)
    }

    return createSuccessResponse(targetUser)

  } catch (error) {
    console.error('Get user error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

// PUT /api/users/[id] - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { isAuthenticated, user, error } = await authenticateUser(request)

    if (!isAuthenticated || !user) {
      return createErrorResponse(error || 'Unauthorized', 401)
    }

    const targetUserId = params.id
    const body: UpdateUserRequest = await request.json()
    const { name, profilePic, isActive } = body

    // Check permissions
    if (!canAccessUser(user, targetUserId)) {
      return createErrorResponse('Access denied', 403)
    }

    // Only admins can change isActive status
    if (isActive !== undefined && !requireAdmin(user)) {
      return createErrorResponse('Admin access required to change user status', 403)
    }

    // Prevent users from disabling themselves
    if (isActive === false && user.id === targetUserId) {
      return createErrorResponse('Cannot disable your own account', 400)
    }

    // Build update data
    const updateData: any = {}
    
    if (name !== undefined) {
      if (name.trim().length < 2) {
        return createErrorResponse('Name must be at least 2 characters long', 400)
      }
      updateData.name = name.trim()
    }

    if (profilePic !== undefined) {
      updateData.profilePic = profilePic
    }

    if (isActive !== undefined && requireAdmin(user)) {
      updateData.isActive = isActive
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: updateData,
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

    return createSuccessResponse(updatedUser)

  } catch (error) {
    console.error('Update user error:', error)
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return createErrorResponse('User not found', 404)
    }
    return createErrorResponse('Internal server error', 500)
  }
}

// DELETE /api/users/[id] - Delete user (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { isAuthenticated, user, error } = await authenticateUser(request)

    if (!isAuthenticated || !user) {
      return createErrorResponse(error || 'Unauthorized', 401)
    }

    if (!requireAdmin(user)) {
      return createErrorResponse('Admin access required', 403)
    }

    const targetUserId = params.id
    const { searchParams } = new URL(request.url)
    const hardDelete = searchParams.get('hard') === 'true'

    // Prevent admins from deleting themselves
    if (user.id === targetUserId) {
      return createErrorResponse('Cannot delete your own account', 400)
    }

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        _count: {
          select: {
            createdTodos: true,
            assignedTodos: true,
            files: true
          }
        }
      }
    })

    if (!targetUser) {
      return createErrorResponse('User not found', 404)
    }

    if (hardDelete) {
      // Hard delete - this will cascade and delete associated todos, files, and notifications
      await prisma.user.delete({
        where: { id: targetUserId }
      })
      
      return createSuccessResponse({ 
        message: 'User and all associated data deleted permanently',
        deletedData: {
          todos: targetUser._count.createdTodos + targetUser._count.assignedTodos,
          files: targetUser._count.files
        }
      })
    } else {
      // Soft delete - deactivate user but keep data
      await prisma.user.update({
        where: { id: targetUserId },
        data: {
          isActive: false,
          email: `deleted_${Date.now()}_${targetUser.email}` // Prevent email conflicts
        }
      })

      return createSuccessResponse({ 
        message: 'User deactivated successfully (data preserved)',
        preservedData: {
          todos: targetUser._count.createdTodos + targetUser._count.assignedTodos,
          files: targetUser._count.files
        }
      })
    }

  } catch (error) {
    console.error('Delete user error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}