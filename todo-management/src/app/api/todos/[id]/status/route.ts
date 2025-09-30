import { NextRequest } from 'next/server'
import { authenticateUser, createErrorResponse, createSuccessResponse, canAccessTodo } from '@/middleware/auth'
import prisma from '@/lib/db/prisma'

// PUT /api/todos/[id]/status - Update todo status
// This endpoint allows both creators and assignees to update the status
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { isAuthenticated, user, error } = await authenticateUser(request)

    if (!isAuthenticated || !user) {
      return createErrorResponse(error || 'Unauthorized', 401)
    }

    const todoId = params.id

    // Check if user can access this todo (as creator or assignee)
    if (!await canAccessTodo(user.id, todoId)) {
      return createErrorResponse('Access denied', 403)
    }

    const body = await request.json()
    const { status } = body

    // Validate status
    if (!status || !['PENDING', 'IN_PROGRESS', 'COMPLETED'].includes(status)) {
      return createErrorResponse('Invalid status', 400)
    }

    // Update status
    const updatedTodo = await prisma.todo.update({
      where: { id: todoId },
      data: { status },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return createSuccessResponse(updatedTodo)

  } catch (error) {
    console.error('Update todo status error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}