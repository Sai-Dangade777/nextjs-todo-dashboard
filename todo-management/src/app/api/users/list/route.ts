import { NextRequest } from 'next/server'
import { authenticateUser, createErrorResponse, createSuccessResponse } from '@/middleware/auth'
import prisma from '@/lib/db/prisma'

// GET /api/users/list - List users for assignment (All authenticated users can access)
export async function GET(request: NextRequest) {
  try {
    const { isAuthenticated, user, error } = await authenticateUser(request)

    if (!isAuthenticated || !user) {
      return createErrorResponse(error || 'Unauthorized', 401)
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const search = searchParams.get('search') || ''

    // Build where clause - only show active users
    const where: any = { isActive: true }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Get active users for assignment
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        profilePic: true
      },
      orderBy: { name: 'asc' },
      take: limit
    })

    return createSuccessResponse({
      users,
      total: users.length
    })

  } catch (error) {
    console.error('Fetch users for assignment error:', error)
    return createErrorResponse('Failed to fetch users', 500)
  }
}