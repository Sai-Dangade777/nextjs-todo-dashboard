'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Search, MoreHorizontal, UserCheck, UserX, Eye, Trash2, Plus } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout';
import CreateUserModal from '@/components/CreateUserModal'
import { useToast } from '@/hooks/use-toast'

interface User {
  id: string
  name: string
  email: string
  role: 'USER' | 'ADMIN'
  isActive: boolean
  profilePic?: string
  createdAt: string
  lastLogin?: string
  _count?: {
    createdTodos: number
    assignedTodos: number
    files: number
  }
}

export default function AdminUsersPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await api.get('/users', {
        params: { 
          page, 
          limit: 20, 
          search,
          sortBy: 'createdAt',
          sortOrder: 'desc',
          isActive: 'true' // Only show active users
        }
      })
      setUsers(response.data.data.users)
      setTotal(response.data.data.total)
    } catch (error) {
      console.error('Failed to fetch users:', error)
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role !== 'ADMIN') {
      toast({
        title: "Access Denied",
        description: "Admin privileges required",
        variant: "destructive"
      })
      return
    }
    fetchUsers()
  }, [page, search, user])

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await api.put(`/users/${userId}`, {
        isActive: !currentStatus
      })
      
      toast({
        title: "Success",
        description: `User ${!currentStatus ? 'activated' : 'deactivated'} successfully`
      })
      
      fetchUsers() // Refresh the list
    } catch (error) {
      console.error('Failed to update user status:', error)
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive"
      })
    }
  }

  const handleDeleteUser = async (userId: string, userName: string, hardDelete: boolean = false) => {
    const deleteType = hardDelete ? 'permanently delete' : 'deactivate';
    const warningMessage = hardDelete 
      ? `Are you sure you want to PERMANENTLY DELETE user "${userName}"? This will delete all their todos, files, and cannot be undone!`
      : `Are you sure you want to deactivate user "${userName}"? They will be hidden from the user list but their data will be preserved.`;
    
    if (!confirm(warningMessage)) {
      return
    }

    try {
      const url = hardDelete ? `/users/${userId}?hard=true` : `/users/${userId}`
      await api.delete(url)
      
      toast({
        title: "Success",
        description: hardDelete 
          ? "User permanently deleted successfully" 
          : "User deactivated successfully"
      })
      fetchUsers() // Refresh the list
    } catch (error) {
      console.error('Failed to delete user:', error)
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive"
      })
    }
  }

  if (user?.role !== 'ADMIN') {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">Admin privileges required to access this page.</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600">Manage all users in the system</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading users...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className={!user.isActive ? 'bg-gray-50 opacity-60' : ''}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.profilePic ? `/api${user.profilePic}` : ''} />
                            <AvatarFallback>
                              {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className={`font-medium ${!user.isActive ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                              {user.name}
                            </p>
                            <p className={`text-sm ${!user.isActive ? 'text-gray-400' : 'text-gray-500'}`}>
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? 'default' : 'destructive'}>
                          {user.isActive ? 'Active' : 'Deactivated'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-500">
                          <div>{user._count?.createdTodos || 0} todos created</div>
                          <div>{user._count?.assignedTodos || 0} todos assigned</div>
                          <div>{user._count?.files || 0} files uploaded</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleToggleStatus(user.id, user.isActive)}
                            >
                              {user.isActive ? (
                                <>
                                  <UserX className="mr-2 h-4 w-4" />
                                  Deactivate User
                                </>
                              ) : (
                                <>
                                  <UserCheck className="mr-2 h-4 w-4" />
                                  Activate User
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteUser(user.id, user.name, true)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Permanently Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {!loading && users.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No users found
              </div>
            )}

            {/* Pagination */}
            {Math.ceil(total / 20) > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="py-2 px-4">
                  Page {page} of {Math.ceil(total / 20)}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= Math.ceil(total / 20)}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create User Modal */}
        <CreateUserModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchUsers}
        />
      </div>
    </AppLayout>
  )
}