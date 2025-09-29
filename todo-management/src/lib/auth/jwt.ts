import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { SafeUser } from '@/types'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

export interface JwtPayload {
  userId: string
  email: string
  role: string
  iat?: number
  exp?: number
}

// Generate JWT token
export const generateToken = (user: SafeUser): string => {
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role
  }
  
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_EXPIRES_IN 
  } as jwt.SignOptions)
}

// Verify JWT token
export const verifyToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload
  } catch {
    throw new Error('Invalid or expired token')
  }
}

// Hash password
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12
  return await bcrypt.hash(password, saltRounds)
}

// Compare password
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash)
}

// Extract token from authorization header
export const extractTokenFromHeader = (authHeader: string | null): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  
  return authHeader.substring(7) // Remove 'Bearer ' prefix
}

// Generate expiry date
export const getTokenExpiry = (): Date => {
  const now = new Date()
  // Default to 7 days from now
  return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
}

// Check if token is about to expire (within 1 hour)
export const isTokenExpiringSoon = (exp: number): boolean => {
  const now = Math.floor(Date.now() / 1000)
  const oneHour = 60 * 60
  return (exp - now) < oneHour
}