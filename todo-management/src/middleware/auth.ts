import { NextRequest } from 'next/server'
import { verifyToken, extractTokenFromHeader, JwtPayload } from '@/lib/auth/jwt'
import prisma from '@/lib/db/prisma'
import { ApiResponse } from '@/types'

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string
    email: string
    role: string
    name: string
  }
}

// Authentication middleware
export async function authenticateUser(request: NextRequest): Promise<{
  isAuthenticated: boolean
  user?: any
  error?: string
}> {
  try {
    const authHeader = request.headers.get('authorization')
    const token = extractTokenFromHeader(authHeader)
    
    if (!token) {
      return { isAuthenticated: false, error: 'No token provided' }
    }

    const payload: JwtPayload = verifyToken(token)
    
    // Fetch user from database to ensure they still exist and are active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true
      }
    })

    if (!user) {
      return { isAuthenticated: false, error: 'User not found' }
    }

    if (!user.isActive) {
      return { isAuthenticated: false, error: 'User account is disabled' }
    }

    return {
      isAuthenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    }
  } catch (error) {
    return { 
      isAuthenticated: false, 
      error: error instanceof Error ? error.message : 'Authentication failed' 
    }
  }
}

// Admin role middleware
export function requireAdmin(user: any): boolean {
  return user && user.role === 'ADMIN'
}

// Check if user can access resource (same user or admin)
export function canAccessUser(currentUser: any, targetUserId: string): boolean {
  return currentUser.id === targetUserId || currentUser.role === 'ADMIN'
}

// Check if user can access todo (view access)
export async function canAccessTodo(userId: string, todoId: string): Promise<boolean> {
  const todo = await prisma.todo.findUnique({
    where: { id: todoId },
    select: {
      creatorId: true,
      assigneeId: true
    }
  })

  if (!todo) {
    return false
  }

  // User can access todo if they created it or it's assigned to them
  return todo.creatorId === userId || todo.assigneeId === userId
}

// Check if user can modify todo (edit access)
export async function canModifyTodo(userId: string, todoId: string): Promise<boolean> {
  const todo = await prisma.todo.findUnique({
    where: { id: todoId },
    select: {
      creatorId: true,
      assigneeId: true
    }
  })

  if (!todo) {
    return false
  }

  // Both the creator and the assignee can modify the todo
  return todo.creatorId === userId || todo.assigneeId === userId
}

// Error response helper
export function createErrorResponse(message: string, status: number = 400): Response {
  const response: ApiResponse = {
    success: false,
    error: { message }
  }
  
  return new Response(JSON.stringify(response), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

// Success response helper
export function createSuccessResponse(data: any, status: number = 200): Response {
  const response: ApiResponse = {
    success: true,
    data
  }
  
  return new Response(JSON.stringify(response), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

// Validation helpers
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePassword(password: string): { isValid: boolean; message?: string } {
  if (password.length < 6) {
    return { isValid: false, message: 'Password must be at least 6 characters long' }
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter' }
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter' }
  }
  
  if (!/(?=.*\d)/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one number' }
  }
  
  return { isValid: true }
}