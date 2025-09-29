import { NextRequest } from 'next/server'
import { hashPassword, generateToken, getTokenExpiry } from '@/lib/auth/jwt'
import { validateEmail, validatePassword, createErrorResponse, createSuccessResponse } from '@/middleware/auth'
import prisma from '@/lib/db/prisma'
import { RegisterRequest, AuthResponse } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json()
    const { name, email, password } = body

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
        role: 'USER' // Default role
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        profilePic: true,
        createdAt: true,
        updatedAt: true
      }
    })

    // Generate JWT token
    const token = generateToken(newUser as any)
    const expiresAt = getTokenExpiry()

    const authResponse: AuthResponse = {
      user: newUser as any,
      token,
      expiresAt: expiresAt.toISOString()
    }

    return createSuccessResponse(authResponse, 201)

  } catch (error) {
    console.error('Registration error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}