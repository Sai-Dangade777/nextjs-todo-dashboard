import { NextRequest } from 'next/server'
import { authenticateUser, canAccessUser, createErrorResponse, createSuccessResponse } from '@/middleware/auth'
import prisma from '@/lib/db/prisma'
import bcrypt from 'bcryptjs'

// PUT /api/users/[id]/password - Change user password
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

    // Check if user can access this resource (same user or admin)
    if (!canAccessUser(user, targetUserId)) {
      return createErrorResponse('Access denied', 403)
    }

    // Get request body
    const body = await request.json()
    const { currentPassword, newPassword } = body

    // Validate inputs
    if (!currentPassword || !newPassword) {
      return createErrorResponse('Current password and new password are required', 400)
    }

    if (newPassword.length < 8) {
      return createErrorResponse('New password must be at least 8 characters long', 400)
    }

    // Get user with password
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        password: true
      }
    })

    if (!targetUser) {
      return createErrorResponse('User not found', 404)
    }

    // Check if current password matches
    const isPasswordValid = await bcrypt.compare(currentPassword, targetUser.password)
    if (!isPasswordValid) {
      return createErrorResponse('Current password is incorrect', 401)
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(newPassword, salt)

    // Update password in database
    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        password: hashedPassword,
        updatedAt: new Date()
      }
    })

    return createSuccessResponse({
      message: 'Password changed successfully'
    })

  } catch (error) {
    console.error('Change password error:', error)
    return createErrorResponse('Failed to change password', 500)
  }
}