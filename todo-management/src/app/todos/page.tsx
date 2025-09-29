'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Calendar, User, Paperclip, Edit } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import TodoModal from '@/components/TodoModal'

interface Todo {
  id: string
  title: string
  description?: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  dueDate?: string
  createdAt: string
  creator: {
    name: string
    email: string
  }
  assignee: {
    name: string
    email: string
  }
  files: Array<{
    id: string
    filename: string
    originalName: string
  }>
}

export default function TodosPage() {
  const { user } = useAuth()
  const [myTodos, setMyTodos] = useState<Todo[]>([])
  const [assignedTodos, setAssignedTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('my-todos')
  const [showTodoModal, setShowTodoModal] = useState(false)
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null)

  const fetchTodos = async () => {
    try {
      setLoading(true)
      
      // Fetch todos assigned to me
      const myTodosResponse = await api.get('/todos', {
        params: { filter: 'assigned-to-me' }
      })
      setMyTodos(myTodosResponse.data.data.todos)

      // Fetch todos I created
      const assignedTodosResponse = await api.get('/todos', {
        params: { filter: 'created-by-me' }
      })
      setAssignedTodos(assignedTodosResponse.data.data.todos)
      
    } catch (error) {
      console.error('Failed to fetch todos:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTodos()
  }, [])

  const handleDragStart = (e: React.DragEvent, todoId: string) => {
    e.dataTransfer.setData('text/plain', todoId)
  }

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault()
    const todoId = e.dataTransfer.getData('text/plain')
    
    try {
      await api.put(`/todos/${todoId}`, { status: newStatus })
      fetchTodos() // Refresh the list
    } catch (error) {
      console.error('Failed to update todo status:', error)
    }
  }

  const handleCreateTodo = () => {
    setSelectedTodo(null)
    setShowTodoModal(true)
  }

  const handleEditTodo = (todo: Todo) => {
    setSelectedTodo(todo)
    setShowTodoModal(true)
  }

  const handleTodoSuccess = () => {
    fetchTodos() // Refresh the todos
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'bg-red-100 text-red-800'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800'
      case 'LOW': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800'
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800'
      case 'PENDING': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const TodoCard = ({ todo }: { todo: Todo }) => (
    <Card
      key={todo.id}
      className="mb-4 cursor-move hover:shadow-md transition-shadow"
      draggable
      onDragStart={(e) => handleDragStart(e, todo.id)}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="truncate">{todo.title}</span>
          <div className="flex items-center space-x-2">
            <Badge className={getPriorityColor(todo.priority)}>
              {todo.priority}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditTodo(todo)}
              className="h-6 w-6 p-0"
            >
              <Edit className="w-3 h-3" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {todo.description && (
            <p className="text-xs text-gray-600 line-clamp-2">
              {todo.description}
            </p>
          )}
          
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>{todo.assignee.name}</span>
            </div>
            
            {todo.dueDate && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{new Date(todo.dueDate).toLocaleDateString()}</span>
              </div>
            )}
            
            {todo.files.length > 0 && (
              <div className="flex items-center gap-1">
                <Paperclip className="w-3 h-3" />
                <span>{todo.files.length}</span>
              </div>
            )}
          </div>
          
          <Badge className={getStatusColor(todo.status)}>
            {todo.status.replace('_', ' ')}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )

  const StatusColumn = ({ title, status, todos }: { title: string, status: string, todos: Todo[] }) => (
    <div
      className="flex-1 min-h-[400px] p-4 bg-gray-50 rounded-lg"
      onDrop={(e) => handleDrop(e, status)}
      onDragOver={handleDragOver}
    >
      <h3 className="font-semibold mb-4 text-center">{title}</h3>
      {todos
        .filter(todo => todo.status === status)
        .map(todo => <TodoCard key={todo.id} todo={todo} />)
      }
    </div>
  )

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Todo Management</h1>
          <Button onClick={handleCreateTodo}>
            <Plus className="w-4 h-4 mr-2" />
            New Todo
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="my-todos">My Todos</TabsTrigger>
            <TabsTrigger value="assigned-todos">Assigned by Me</TabsTrigger>
          </TabsList>
          
          <TabsContent value="my-todos" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatusColumn 
                title="Pending" 
                status="PENDING" 
                todos={myTodos} 
              />
              <StatusColumn 
                title="In Progress" 
                status="IN_PROGRESS" 
                todos={myTodos} 
              />
              <StatusColumn 
                title="Completed" 
                status="COMPLETED" 
                todos={myTodos} 
              />
            </div>
          </TabsContent>
          
          <TabsContent value="assigned-todos" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatusColumn 
                title="Pending" 
                status="PENDING" 
                todos={assignedTodos} 
              />
              <StatusColumn 
                title="In Progress" 
                status="IN_PROGRESS" 
                todos={assignedTodos} 
              />
              <StatusColumn 
                title="Completed" 
                status="COMPLETED" 
                todos={assignedTodos} 
              />
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Todo Create/Edit Modal */}
        <TodoModal
          isOpen={showTodoModal}
          onClose={() => setShowTodoModal(false)}
          todo={selectedTodo}
          onSuccess={handleTodoSuccess}
        />
      </div>
    </AppLayout>
  )
}