import { NextRequest } from 'next/server'
import { authenticateUser, createErrorResponse, createSuccessResponse, requireAdmin, validateEmail, validatePassword } from '@/middleware/auth'
import { hashPassword } from '@/lib/auth/jwt'
import prisma from '@/lib/db/prisma'

// GET /api/users - List all users (Admin only)
export async function GET(request: NextRequest) {
  try {
    const { isAuthenticated, user, error } = await authenticateUser(request)

    if (!isAuthenticated || !user) {
      return createErrorResponse(error || 'Unauthorized', 401)
    }

    if (!requireAdmin(user)) {
      return createErrorResponse('Admin access required', 403)
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const isActive = searchParams.get('isActive')

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Filter by active status
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true'
    }
    // If isActive is null/undefined, don't filter by status (show all users)

    // Get users with pagination
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          profilePic: true,
          createdAt: true,
          updatedAt: true,
          lastLogin: true,
          _count: {
            select: {
              createdTodos: true,
              assignedTodos: true,
              files: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder }
      }),
      prisma.user.count({ where })
    ])

    return createSuccessResponse({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Get users error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

// POST /api/users - Create user (Admin only)
export async function POST(request: NextRequest) {
  try {
    const { isAuthenticated, user, error } = await authenticateUser(request)

    if (!isAuthenticated || !user) {
      return createErrorResponse(error || 'Unauthorized', 401)
    }

    if (!requireAdmin(user)) {
      return createErrorResponse('Admin access required', 403)
    }

    const body = await request.json()
    const { name, email, password, role = 'USER' } = body

    // Validate input
    if (!name || !email || !password) {
      return createErrorResponse('Name, email, and password are required', 400)
    }

    if (name.trim().length < 2) {
      return createErrorResponse('Name must be at least 2 characters long', 400)
    }

    if (!validateEmail(email)) {
      return createErrorResponse('Invalid email format', 400)
    }

    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      return createErrorResponse(passwordValidation.message!, 400)
    }

    // Validate role
    if (role && !['USER', 'ADMIN'].includes(role)) {
      return createErrorResponse('Invalid role. Must be USER or ADMIN', 400)
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existingUser) {
      return createErrorResponse('User with this email already exists', 409)
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password)
    
    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase(),
        password: hashedPassword,
        role: role,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        profilePic: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            createdTodos: true,
            assignedTodos: true,
            files: true
          }
        }
      }
    })

    return createSuccessResponse({
      user: newUser,
      message: 'User created successfully'
    })

  } catch (error) {
    console.error('Create user error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}