import { NextRequest } from 'next/server'
import { comparePassword, generateToken, getTokenExpiry } from '@/lib/auth/jwt'
import { validateEmail, createErrorResponse, createSuccessResponse } from '@/middleware/auth'
import prisma from '@/lib/db/prisma'
import { LoginRequest, AuthResponse } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json()
    const { email, password } = body

    // Validate input
    if (!email || !password) {
      return createErrorResponse('Email and password are required', 400)
    }

    if (!validateEmail(email)) {
      return createErrorResponse('Invalid email format', 400)
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (!user) {
      return createErrorResponse('Invalid email or password', 401)
    }

    // Check if account is active
    if (!user.isActive) {
      return createErrorResponse('Account is disabled. Please contact administrator.', 403)
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password)
    if (!isValidPassword) {
      return createErrorResponse('Invalid email or password', 401)
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    })

    // Prepare safe user object (without password)
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      profilePic: user.profilePic,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }

    // Generate JWT token
    const token = generateToken(safeUser as any)
    const expiresAt = getTokenExpiry()

    const authResponse: AuthResponse = {
      user: safeUser as any,
      token,
      expiresAt: expiresAt.toISOString()
    }

    return createSuccessResponse(authResponse)

  } catch (error) {
    console.error('Login error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}