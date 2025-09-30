import { NextRequest } from 'next/server'
import { authenticateUser, createErrorResponse, createSuccessResponse } from '@/middleware/auth'
import prisma from '@/lib/db/prisma'
import { CreateTodoRequest, TodoStatus, TodoPriority } from '@/types'

// GET /api/todos - List todos with filters
export async function GET(request: NextRequest) {
  try {
    const { isAuthenticated, user, error } = await authenticateUser(request)

    if (!isAuthenticated || !user) {
      return createErrorResponse(error || 'Unauthorized', 401)
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const status = searchParams.get('status') as TodoStatus | null
    const priority = searchParams.get('priority') as TodoPriority | null
    const assigneeId = searchParams.get('assigneeId')
    const creatorId = searchParams.get('creatorId')
    const filter = searchParams.get('filter') // 'assigned_to_me', 'created_by_me', 'all'

    const skip = (page - 1) * limit

    // Build where clause based on filters
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    // Apply user-specific filters
    if (filter === 'assigned_to_me') {
      // Only show todos assigned to the current user
      where.assigneeId = user.id
    } else if (filter === 'created_by_me') {
      // Only show todos created by the current user AND assigned to other users
      where.creatorId = user.id
      where.assigneeId = { not: user.id }
    } else {
      // Default: show todos where user is either creator or assignee
      where.OR = [
        { creatorId: user.id },
        { assigneeId: user.id }
      ]
    }

    // Apply additional filters
    if (status) {
      where.status = status
    }

    if (priority) {
      where.priority = priority
    }

    if (assigneeId) {
      where.assigneeId = assigneeId
    }

    if (creatorId) {
      where.creatorId = creatorId
    }

    if (search) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
          ]
        }
      ]
    }

    // Get todos with relations
    const [todos, total] = await Promise.all([
      prisma.todo.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              profilePic: true
            }
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              profilePic: true
            }
          },
          files: {
            select: {
              id: true,
              fileName: true,
              originalName: true,
              fileSize: true,
              mimeType: true,
              uploadedAt: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: sortBy === 'position' 
          ? [{ position: sortOrder as any }, { createdAt: 'desc' }]
          : { [sortBy]: sortOrder }
      }),
      prisma.todo.count({ where })
    ])

    return createSuccessResponse({
      todos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Get todos error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

// POST /api/todos - Create new todo
export async function POST(request: NextRequest) {
  try {
    const { isAuthenticated, user, error } = await authenticateUser(request)

    if (!isAuthenticated || !user) {
      return createErrorResponse(error || 'Unauthorized', 401)
    }

    const body: CreateTodoRequest = await request.json()
    const { title, description, assigneeId, dueDate, priority } = body

    // Validation
    if (!title || title.trim().length === 0) {
      return createErrorResponse('Title is required', 400)
    }

    if (title.length > 255) {
      return createErrorResponse('Title must be less than 255 characters', 400)
    }

    if (!assigneeId) {
      return createErrorResponse('Assignee is required', 400)
    }

    // Verify assignee exists and is active
    const assignee = await prisma.user.findUnique({
      where: { id: assigneeId },
      select: { id: true, isActive: true }
    })

    if (!assignee) {
      return createErrorResponse('Assignee not found', 404)
    }

    if (!assignee.isActive) {
      return createErrorResponse('Cannot assign todo to inactive user', 400)
    }

    // Parse due date if provided
    let parsedDueDate: Date | undefined
    if (dueDate) {
      parsedDueDate = new Date(dueDate)
      if (isNaN(parsedDueDate.getTime())) {
        return createErrorResponse('Invalid due date format', 400)
      }
      // Check if due date is in the past (allow current day)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (parsedDueDate < today) {
        return createErrorResponse('Due date cannot be in the past', 400)
      }
    }

    // Get next position for ordering
    const lastTodo = await prisma.todo.findFirst({
      where: { assigneeId },
      orderBy: { position: 'desc' },
      select: { position: true }
    })

    const position = (lastTodo?.position || 0) + 1

    // Create todo
    const newTodo = await prisma.todo.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        creatorId: user.id,
        assigneeId,
        dueDate: parsedDueDate,
        priority: priority || 'MEDIUM',
        position
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePic: true
          }
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePic: true
          }
        },
        files: true
      }
    })

    // TODO: Create notification for assignee (if different from creator)
    if (assigneeId !== user.id) {
      await prisma.notification.create({
        data: {
          title: 'New Todo Assigned',
          message: `You have been assigned a new todo: "${title}"`,
          type: 'todo_assigned',
          userId: assigneeId,
          todoId: newTodo.id,
          metadata: {
            creatorName: user.name,
            todoTitle: title
          }
        }
      })
    }

    return createSuccessResponse(newTodo, 201)

  } catch (error) {
    console.error('Create todo error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}