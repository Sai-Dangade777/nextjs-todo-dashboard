import axios from 'axios'
import { 
  AuthResponse, 
  LoginRequest, 
  RegisterRequest, 
  SafeUser,
  ApiResponse,
  TodoWithRelations,
  CreateTodoRequest,
  UpdateTodoRequest,
  TodoFilters,
  PaginationParams,
  PaginatedResponse
} from '@/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api'

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', credentials)
    return response.data.data!
  },

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', userData)
    return response.data.data!
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout')
  },

  async me(): Promise<SafeUser> {
    const response = await api.get<ApiResponse<{ user: SafeUser }>>('/auth/me')
    return response.data.data!.user
  }
}

// Todo API
export const todoAPI = {
  async getTodos(params?: TodoFilters & PaginationParams): Promise<PaginatedResponse<TodoWithRelations>> {
    const response = await api.get<ApiResponse<PaginatedResponse<TodoWithRelations>>>('/todos', { params })
    return response.data.data!
  },

  async getTodo(id: string): Promise<TodoWithRelations> {
    const response = await api.get<ApiResponse<TodoWithRelations>>(`/todos/${id}`)
    return response.data.data!
  },

  async createTodo(data: CreateTodoRequest): Promise<TodoWithRelations> {
    const response = await api.post<ApiResponse<TodoWithRelations>>('/todos', data)
    return response.data.data!
  },

  async updateTodo(id: string, data: UpdateTodoRequest): Promise<TodoWithRelations> {
    const response = await api.put<ApiResponse<TodoWithRelations>>(`/todos/${id}`, data)
    return response.data.data!
  },

  async deleteTodo(id: string): Promise<void> {
    await api.delete(`/todos/${id}`)
  }
}

// Dashboard API
export const dashboardAPI = {
  async getStats(): Promise<any> {
    const response = await api.get<ApiResponse<any>>('/dashboard/stats')
    return response.data.data!
  }
}

// User API
export const userAPI = {
  async getUsers(params?: any): Promise<any> {
    const response = await api.get<ApiResponse<any>>('/users', { params })
    return response.data.data!
  },

  async getUser(id: string): Promise<SafeUser> {
    const response = await api.get<ApiResponse<SafeUser>>(`/users/${id}`)
    return response.data.data!
  },

  async updateUser(id: string, data: any): Promise<SafeUser> {
    const response = await api.put<ApiResponse<SafeUser>>(`/users/${id}`, data)
    return response.data.data!
  },

  async deleteUser(id: string): Promise<void> {
    await api.delete(`/users/${id}`)
  }
}

// File API
export const fileAPI = {
  async uploadFiles(files: FileList, todoId?: string): Promise<any> {
    const formData = new FormData()
    
    Array.from(files).forEach(file => {
      formData.append('files', file)
    })
    
    if (todoId) {
      formData.append('todoId', todoId)
    }

    const response = await api.post<ApiResponse<any>>('/files', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data.data!
  },

  async getFiles(params?: any): Promise<any> {
    const response = await api.get<ApiResponse<any>>('/files', { params })
    return response.data.data!
  },

  async deleteFile(id: string): Promise<void> {
    await api.delete(`/files/${id}`)
  },

  getFileUrl(filename: string): string {
    return `${API_BASE_URL}/files/serve/${filename}`
  }
}

export default api