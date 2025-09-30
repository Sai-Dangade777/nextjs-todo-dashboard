'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Upload, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface User {
  id: string
  name: string
  email: string
}

interface TodoFile {
  id: string
  filename: string
  originalName: string
}

interface Todo {
  id?: string
  title: string
  description?: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate?: string
  assigneeId: string
  creatorId?: string
  files?: TodoFile[] | File[]
}

interface TodoModalProps {
  isOpen: boolean
  onClose: () => void
  todo?: Todo | null
  onSuccess: () => void
}

export default function TodoModal({ isOpen, onClose, todo, onSuccess }: TodoModalProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isEditable, setIsEditable] = useState(true)
  
  const [formData, setFormData] = useState<Todo>({
    title: '',
    description: '',
    status: 'PENDING',
    priority: 'MEDIUM',
    assigneeId: user?.id || '',
  })

  // Fetch users for assignment
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get('/users/list', { params: { limit: 100 } })
        setUsers(response.data.data.users || [])
      } catch (error) {
        console.error('Failed to fetch users:', error)
        // Show toast error
        toast({
          title: "Error",
          description: "Failed to load users for assignment",
          variant: "destructive"
        })
      }
    }
    
    if (isOpen) {
      fetchUsers()
    }
  }, [isOpen])

  // Fetch todo details including files if editing an existing todo
  useEffect(() => {
    if (todo?.id) {
      const fetchTodoDetails = async () => {
        try {
          const response = await api.get(`/todos/${todo.id}`);
          const todoData = response.data;
          
          // Check if current user is the creator or assignee
          const canEdit = todoData.creatorId === user?.id || todoData.assigneeId === user?.id;
          setIsEditable(canEdit);
          
          setFormData({
            id: todoData.id,
            title: todoData.title,
            description: todoData.description || '',
            status: todoData.status,
            priority: todoData.priority,
            dueDate: todoData.dueDate,
            assigneeId: todoData.assigneeId,
            creatorId: todoData.creatorId,
            files: todoData.files || []
          });
        } catch (error) {
          console.error('Failed to fetch todo details:', error);
          toast({
            title: "Error",
            description: "Failed to load todo details",
            variant: "destructive"
          });
        }
      };
      
      fetchTodoDetails();
    } else {
      // For new todos
      setFormData({
        title: '',
        description: '',
        status: 'PENDING',
        priority: 'MEDIUM',
        assigneeId: user?.id || '',
      });
      setSelectedFiles([]);
      setIsEditable(true); // New todos are always editable
    }
  }, [todo, user, isOpen])

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    // Validate file count
    if (selectedFiles.length + files.length > 5) {
      toast({
        title: "Error",
        description: "Maximum 5 files allowed per todo",
        variant: "destructive"
      })
      return
    }

    // Validate file sizes
    const oversizedFiles = files.filter(file => file.size > 10 * 1024 * 1024) // 10MB
    if (oversizedFiles.length > 0) {
      toast({
        title: "Error",
        description: "File size cannot exceed 10MB",
        variant: "destructive"
      })
      return
    }

    setSelectedFiles(prev => [...prev, ...files])
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "Title is required",
        variant: "destructive"
      })
      return
    }

    if (!formData.assigneeId) {
      toast({
        title: "Error",
        description: "Please select an assignee",
        variant: "destructive"
      })
      return
    }

    try {
      setLoading(true)
      
      let response
      if (todo?.id) {
        // Update existing todo
        response = await api.put(`/todos/${todo.id}`, formData)
      } else {
        // Create new todo
        response = await api.post('/todos', formData)
      }

      // Upload files if any
      if (selectedFiles.length > 0 && response.data.data) {
        const formData = new FormData()
        formData.append('todoId', response.data.data.id)
        selectedFiles.forEach(file => {
          formData.append('files', file)
        })

        await api.post('/files', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
      }

      toast({
        title: "Success",
        description: todo?.id ? "Todo updated successfully" : "Todo created successfully"
      })

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Failed to save todo:', error)
      toast({
        title: "Error",
        description: "Failed to save todo",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {todo?.id ? 'Edit Todo' : 'Create New Todo'}
          </DialogTitle>
          <DialogDescription>
            {todo?.id ? 'Update the todo details below.' : 'Fill in the details to create a new todo.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEditable && (
            <div className="bg-yellow-50 border border-yellow-100 p-3 rounded-md mb-4">
              <p className="text-yellow-700 text-sm">
                View mode: Only the creator or assignee can modify this todo.
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4">
            {/* Title */}
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter todo title"
                required
                readOnly={!isEditable}
                disabled={!isEditable}
                className={!isEditable ? "bg-gray-50" : ""}
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('description', e.target.value)}
                placeholder="Enter todo description (optional)"
                rows={3}
                readOnly={!isEditable}
                disabled={!isEditable}
                className={!isEditable ? "bg-gray-50" : ""}
              />
            </div>

            {/* Priority and Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <select 
                  id="priority"
                  value={formData.priority} 
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!isEditable}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              {todo?.id && (
                <div>
                  <Label htmlFor="status">Status</Label>
                  <select 
                    id="status"
                    value={formData.status} 
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!isEditable}
                  >
                    <option value="PENDING">Pending</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              )}
            </div>

            {/* Assignee */}
            <div>
              <Label htmlFor="assignee">Assign To</Label>
              <select 
                id="assignee"
                value={formData.assigneeId} 
                onChange={(e) => handleInputChange('assigneeId', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!isEditable}
                required
              >
                <option value="">Select assignee</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="datetime-local"
                value={formData.dueDate ? new Date(formData.dueDate).toISOString().slice(0, 16) : ''}
                onChange={(e) => handleInputChange('dueDate', e.target.value ? new Date(e.target.value).toISOString() : '')}
                readOnly={!isEditable}
                disabled={!isEditable}
                className={!isEditable ? "bg-gray-50" : ""}
              />
            </div>

            {/* File Upload */}
            <div>
              <Label>Attachments</Label>
              <div className="space-y-2">
                {/* New file upload for new todos or adding files to existing todos */}
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                  accept="*/*"
                  disabled={!isEditable}
                />
                <label htmlFor={isEditable ? "file-upload" : ""}>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full" 
                    asChild
                    disabled={!isEditable}
                  >
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      {todo?.id ? 'Add More Files' : 'Select Files'} (Max 5 files, 10MB each)
                    </span>
                  </Button>
                </label>
                
                {/* Selected files for upload */}
                {selectedFiles.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium mt-2">New Files to Upload:</p>
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <span className="text-sm truncate">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          disabled={!isEditable}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Existing files for the todo */}
                {todo?.id && todo.files && todo.files.length > 0 && (
                  <div className="space-y-1 mt-3">
                    <p className="text-sm font-medium">Attached Files:</p>
                    {todo.files.map((file) => (
                      <div key={file.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <span className="text-sm truncate">{file.originalName || file.filename}</span>
                        <div className="flex space-x-1">
                          <a 
                            href={`/api/files/serve/${file.filename}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Download
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {isEditable ? 'Cancel' : 'Close'}
            </Button>
            {isEditable && (
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : (todo?.id ? 'Update Todo' : 'Create Todo')}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}