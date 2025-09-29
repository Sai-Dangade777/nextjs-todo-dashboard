import { NextRequest } from 'next/server'
import { authenticateUser, createErrorResponse, createSuccessResponse } from '@/middleware/auth'
import prisma from '@/lib/db/prisma'
import { DashboardStats } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const { isAuthenticated, user, error } = await authenticateUser(request)

    if (!isAuthenticated || !user) {
      return createErrorResponse(error || 'Unauthorized', 401)
    }

    // Get comprehensive dashboard statistics
    const [
      totalTodos,
      completedTodos,
      pendingTodos,
      inProgressTodos,
      overdueTodos,
      todosAssignedToMe,
      todosCreatedByMe,
      recentTodos,
      upcomingDeadlines,
      unreadNotifications
    ] = await Promise.all([
      // Total todos (created by me or assigned to me)
      prisma.todo.count({
        where: {
          OR: [
            { creatorId: user.id },
            { assigneeId: user.id }
          ]
        }
      }),
      
      // Completed todos
      prisma.todo.count({
        where: {
          OR: [
            { creatorId: user.id },
            { assigneeId: user.id }
          ],
          status: 'COMPLETED'
        }
      }),
      
      // Pending todos
      prisma.todo.count({
        where: {
          OR: [
            { creatorId: user.id },
            { assigneeId: user.id }
          ],
          status: 'PENDING'
        }
      }),
      
      // In progress todos
      prisma.todo.count({
        where: {
          OR: [
            { creatorId: user.id },
            { assigneeId: user.id }
          ],
          status: 'IN_PROGRESS'
        }
      }),
      
      // Overdue todos
      prisma.todo.count({
        where: {
          OR: [
            { creatorId: user.id },
            { assigneeId: user.id }
          ],
          status: { not: 'COMPLETED' },
          dueDate: { lt: new Date() }
        }
      }),
      
      // Todos assigned to me
      prisma.todo.count({
        where: { assigneeId: user.id }
      }),
      
      // Todos created by me
      prisma.todo.count({
        where: { creatorId: user.id }
      }),
      
      // Recent todos (last 7 days)
      prisma.todo.findMany({
        where: {
          OR: [
            { creatorId: user.id },
            { assigneeId: user.id }
          ],
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              profilePic: true
            }
          },
          assignee: {
            select: {
              id: true,
              name: true,
              profilePic: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),
      
      // Upcoming deadlines (next 7 days)
      prisma.todo.findMany({
        where: {
          OR: [
            { creatorId: user.id },
            { assigneeId: user.id }
          ],
          status: { not: 'COMPLETED' },
          dueDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              profilePic: true
            }
          },
          assignee: {
            select: {
              id: true,
              name: true,
              profilePic: true
            }
          }
        },
        orderBy: { dueDate: 'asc' },
        take: 5
      }),
      
      // Unread notifications
      prisma.notification.count({
        where: {
          userId: user.id,
          isRead: false
        }
      })
    ])

    const stats: DashboardStats = {
      totalTodos,
      completedTodos,
      pendingTodos,
      overdueTodos,
      todosAssignedToMe,
      todosCreatedByMe
    }

    // Calculate progress percentage
    const progressPercentage = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0

    // Priority distribution
    const priorityStats = await prisma.todo.groupBy({
      by: ['priority'],
      where: {
        OR: [
          { creatorId: user.id },
          { assigneeId: user.id }
        ],
        status: { not: 'COMPLETED' }
      },
      _count: true
    })

    // Status distribution
    const statusStats = await prisma.todo.groupBy({
      by: ['status'],
      where: {
        OR: [
          { creatorId: user.id },
          { assigneeId: user.id }
        ]
      },
      _count: true
    })

    return createSuccessResponse({
      stats: {
        ...stats,
        inProgressTodos,
        progressPercentage,
        unreadNotifications
      },
      charts: {
        priorityDistribution: priorityStats.map((p: any) => ({
          priority: p.priority,
          count: p._count
        })),
        statusDistribution: statusStats.map((s: any) => ({
          status: s.status,
          count: s._count
        }))
      },
      recentActivity: {
        recentTodos,
        upcomingDeadlines
      }
    })

  } catch (error) {
    console.error('Dashboard stats error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}