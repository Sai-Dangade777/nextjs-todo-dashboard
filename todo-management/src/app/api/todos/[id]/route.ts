import { NextRequest } from 'next/server'
import { authenticateUser, createErrorResponse, createSuccessResponse, canAccessTodo } from '@/middleware/auth'
import prisma from '@/lib/db/prisma'
import { UpdateTodoRequest } from '@/types'

// GET /api/todos/[id] - Get specific todo
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { isAuthenticated, user, error } = await authenticateUser(request)

    if (!isAuthenticated || !user) {
      return createErrorResponse(error || 'Unauthorized', 401)
    }

    const todoId = params.id

    // Check if user can access this todo
    if (!await canAccessTodo(user.id, todoId)) {
      return createErrorResponse('Access denied', 403)
    }

    const todo = await prisma.todo.findUnique({
      where: { id: todoId },
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
            uploadedAt: true,
            uploadedBy: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    if (!todo) {
      return createErrorResponse('Todo not found', 404)
    }

    return createSuccessResponse(todo)

  } catch (error) {
    console.error('Get todo error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

// PUT /api/todos/[id] - Update todo
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

    // Check if user can access this todo
    if (!await canAccessTodo(user.id, todoId)) {
      return createErrorResponse('Access denied', 403)
    }

    const body: UpdateTodoRequest = await request.json()
    const { title, description, status, priority, dueDate, position } = body

    // Validate inputs
    if (title !== undefined && (!title || title.trim().length === 0)) {
      return createErrorResponse('Title cannot be empty', 400)
    }

    if (title !== undefined && title.length > 255) {
      return createErrorResponse('Title must be less than 255 characters', 400)
    }

    // Parse due date if provided
    let parsedDueDate: Date | null | undefined
    if (dueDate !== undefined) {
      if (dueDate === null || dueDate === '') {
        parsedDueDate = null // Clear due date
      } else {
        parsedDueDate = new Date(dueDate)
        if (isNaN(parsedDueDate.getTime())) {
          return createErrorResponse('Invalid due date format', 400)
        }
      }
    }

    // Get current todo for comparison
    const currentTodo = await prisma.todo.findUnique({
      where: { id: todoId },
      select: {
        title: true,
        description: true,
        status: true,
        priority: true,
        dueDate: true,
        assigneeId: true,
        assignee: {
          select: { name: true }
        }
      }
    })

    if (!currentTodo) {
      return createErrorResponse('Todo not found', 404)
    }

    // Build update data
    const updateData: any = {}
    const changes: any = {}

    if (title !== undefined && title !== currentTodo.title) {
      updateData.title = title.trim()
      changes.title = { from: currentTodo.title, to: title.trim() }
    }

    if (description !== undefined && description !== currentTodo.description) {
      updateData.description = description?.trim() || null
      changes.description = { 
        from: currentTodo.description, 
        to: description?.trim() || null 
      }
    }

    if (status !== undefined && status !== currentTodo.status) {
      updateData.status = status
      changes.status = { from: currentTodo.status, to: status }
      
      // Set completion date if marking as completed
      if (status === 'COMPLETED') {
        updateData.completedAt = new Date()
      } else if (currentTodo.status === 'COMPLETED') {
        updateData.completedAt = null // Clear completion date
      }
    }

    if (priority !== undefined && priority !== currentTodo.priority) {
      updateData.priority = priority
      changes.priority = { from: currentTodo.priority, to: priority }
    }

    if (parsedDueDate !== undefined && parsedDueDate?.getTime() !== currentTodo.dueDate?.getTime()) {
      updateData.dueDate = parsedDueDate
      changes.dueDate = { from: currentTodo.dueDate, to: parsedDueDate }
    }

    if (position !== undefined) {
      updateData.position = position
    }

    // Only update if there are actual changes
    if (Object.keys(updateData).length === 0) {
      return createErrorResponse('No changes detected', 400)
    }

    // Update todo
    const updatedTodo = await prisma.todo.update({
      where: { id: todoId },
      data: updateData,
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
      }
    })

    // Create notification if there are significant changes
    if (Object.keys(changes).length > 0 && currentTodo.assigneeId !== user.id) {
      await prisma.notification.create({
        data: {
          title: 'Todo Updated',
          message: `Your todo "${updatedTodo.title}" has been updated`,
          type: 'todo_updated',
          userId: currentTodo.assigneeId,
          todoId: todoId,
          metadata: {
            updatedBy: user.name,
            changes
          }
        }
      })
    }

    // Special notification for completion
    if (status === 'COMPLETED' && currentTodo.assigneeId !== user.id) {
      await prisma.notification.create({
        data: {
          title: 'Todo Completed',
          message: `Your todo "${updatedTodo.title}" has been marked as completed`,
          type: 'todo_completed',
          userId: currentTodo.assigneeId,
          todoId: todoId,
          metadata: {
            completedBy: user.name
          }
        }
      })
    }

    return createSuccessResponse(updatedTodo)

  } catch (error) {
    console.error('Update todo error:', error)
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return createErrorResponse('Todo not found', 404)
    }
    return createErrorResponse('Internal server error', 500)
  }
}

// DELETE /api/todos/[id] - Delete todo
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { isAuthenticated, user, error } = await authenticateUser(request)

    if (!isAuthenticated || !user) {
      return createErrorResponse(error || 'Unauthorized', 401)
    }

    const todoId = params.id

    // Check if user can access this todo
    if (!await canAccessTodo(user.id, todoId)) {
      return createErrorResponse('Access denied', 403)
    }

    // Get todo details before deletion for notification
    const todo = await prisma.todo.findUnique({
      where: { id: todoId },
      select: {
        title: true,
        creatorId: true,
        assigneeId: true
      }
    })

    if (!todo) {
      return createErrorResponse('Todo not found', 404)
    }

    // Only creator can delete the todo
    if (todo.creatorId !== user.id) {
      return createErrorResponse('Only the creator can delete this todo', 403)
    }

    // Delete todo (cascade will handle files and notifications)
    await prisma.todo.delete({
      where: { id: todoId }
    })

    // Notify assignee if different from creator
    if (todo.assigneeId !== user.id) {
      try {
        await prisma.notification.create({
          data: {
            title: 'Todo Deleted',
            message: `The todo "${todo.title}" has been deleted by ${user.name}`,
            type: 'todo_updated',
            userId: todo.assigneeId,
            metadata: {
              deletedBy: user.name,
              todoTitle: todo.title
            }
          }
        })
      } catch (notificationError) {
        // Log error but don't fail the deletion
        console.error('Failed to create deletion notification:', notificationError)
      }
    }

    return createSuccessResponse({ message: 'Todo deleted successfully' })

  } catch (error) {
    console.error('Delete todo error:', error)
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return createErrorResponse('Todo not found', 404)
    }
    return createErrorResponse('Internal server error', 500)
  }
}