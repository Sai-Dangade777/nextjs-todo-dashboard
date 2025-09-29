// Manual type definitions since Prisma client is having import issues
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN'
}

export enum TodoStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum TodoPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

// Base model types
export interface User {
  id: string
  email: string
  name: string
  password: string
  role: UserRole
  profilePic: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Todo {
  id: string
  title: string
  description: string | null
  status: TodoStatus
  priority: TodoPriority
  dueDate: Date | null
  position: number
  creatorId: string
  assigneeId: string
  createdAt: Date
  updatedAt: Date
}

export interface File {
  id: string
  filename: string
  originalName: string
  mimetype: string
  size: number
  path: string
  todoId: string
  uploadedById: string
  createdAt: Date
  updatedAt: Date
}

export interface Notification {
  id: string
  title: string
  message: string
  isRead: boolean
  userId: string
  createdAt: Date
  updatedAt: Date
}

// Extended types for API responses
export interface SafeUser extends Omit<User, 'password'> {
  // Exclude password from user responses
}

export interface TodoWithRelations extends Todo {
  creator: SafeUser
  assignee: SafeUser
  files: File[]
  _count?: {
    files: number
  }
}

export interface FileWithRelations extends File {
  todo?: Todo
  uploadedBy: SafeUser
}

export interface NotificationWithRelations extends Notification {
  user: SafeUser
  todo?: Todo
}

// API Request/Response types
export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
}

export interface AuthResponse {
  user: SafeUser
  token: string
  expiresAt: string
}

export interface CreateTodoRequest {
  title: string
  description?: string
  assigneeId: string
  dueDate?: string
  priority?: TodoPriority
  files?: FileList
}

export interface UpdateTodoRequest {
  title?: string
  description?: string
  status?: TodoStatus
  priority?: TodoPriority
  dueDate?: string
  position?: number
}

export interface UpdateUserRequest {
  name?: string
  profilePic?: string
  isActive?: boolean  // Only for admins
}

// Filter and pagination types
export interface TodoFilters {
  status?: TodoStatus
  priority?: TodoPriority
  assigneeId?: string
  creatorId?: string
  dueBefore?: string
  dueAfter?: string
  search?: string
}

export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Dashboard statistics
export interface DashboardStats {
  totalTodos: number
  completedTodos: number
  pendingTodos: number
  overdueTodos: number
  todosAssignedToMe: number
  todosCreatedByMe: number
}

// Error types
export interface ApiError {
  message: string
  field?: string
  code?: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: ApiError
  errors?: ApiError[]
}

// Notification types
export type NotificationType = 
  | 'todo_assigned' 
  | 'todo_updated' 
  | 'todo_completed' 
  | 'todo_due_soon' 
  | 'todo_overdue'
  | 'user_disabled'
  | 'user_enabled'

export interface NotificationMetadata {
  todoId?: string
  changes?: Record<string, any>
  actionBy?: string
}

// File upload types
export interface UploadedFile {
  fieldname: string
  originalname: string
  encoding: string
  mimetype: string
  size: number
  filename: string
  path: string
}