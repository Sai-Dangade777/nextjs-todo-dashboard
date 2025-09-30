'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Menu,
  X,
  Home,
  CheckSquare,
  FileText,
  Users,
  User,
  Settings,
  LogOut,
  Bell,
  Check
} from 'lucide-react'

interface Notification {
  id: string
  title: string
  message: string
  isRead: boolean
  type: string
  createdAt: string
  todo?: {
    id: string
    title: string
    dueDate?: string
    status: string
  }
}

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await api.get('/notifications', {
          params: { limit: 10, unread: 'true' }
        })
        setNotifications(response.data.data.notifications || [])
      } catch (error) {
        console.error('Failed to fetch notifications:', error)
      }
    }

    if (user) {
      fetchNotifications()
      // Refresh notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [user])

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  const handleNotificationClick = async (notification: Notification) => {
    try {
      // Mark as read
      await api.put(`/notifications/${notification.id}`, { isRead: true })
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
      )

      // Navigate to related todo if exists
      if (notification.todo) {
        router.push(`/todos?highlight=${notification.todo.id}`)
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }
  
  const handleMarkAllAsRead = async () => {
    try {
      // Mark all as read via API
      await api.put('/notifications/mark-all-read')
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, isRead: true }))
      )
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'My Todos', href: '/todos', icon: CheckSquare },
    { name: 'Files', href: '/files', icon: FileText },
    ...(user?.role === 'ADMIN' 
      ? [{ name: 'Users', href: '/admin/users', icon: Users }] 
      : []),
    { name: 'Profile', href: '/profile', icon: Settings },
  ]

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar for desktop */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-grow pt-5 bg-white overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <h1 className="text-xl font-semibold text-gray-900">Todo Manager</h1>
          </div>
          
          <div className="mt-5 flex-grow flex flex-col">
            <nav className="flex-1 px-2 pb-4 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive(item.href)
                        ? 'bg-blue-100 text-blue-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* User info */}
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <div className="flex items-center">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.profilePic || ''} alt={user?.name} />
                <AvatarFallback>
                  {user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700 truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 flex z-40 md:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full pt-5 pb-4 bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            
            <div className="flex items-center flex-shrink-0 px-4">
              <h1 className="text-xl font-semibold text-gray-900">Todo Manager</h1>
            </div>
            
            <div className="mt-5 flex-1 h-0 overflow-y-auto">
              <nav className="px-2 space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                        isActive(item.href)
                          ? 'bg-blue-100 text-blue-900'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="mr-4 h-6 w-6" />
                      {item.name}
                    </Link>
                  )
                })}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Top bar */}
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
          <button
            type="button"
            className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 md:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex-1 px-4 flex justify-between">
            <div className="flex-1 flex items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                {navigation.find(nav => isActive(nav.href))?.name || 'Dashboard'}
              </h2>
            </div>
            
            <div className="ml-4 flex items-center md:ml-6 space-x-3">
              {/* Notifications */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                        {unreadCount}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-80" align="end">
                  <div className="flex items-center justify-between p-2 border-b">
                    <p className="font-medium">Notifications</p>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <>
                          <Badge variant="secondary">{unreadCount} new</Badge>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAllAsRead();
                            }}
                          >
                            <Check className="w-3 h-3 mr-1" />
                            Mark all read
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  {notifications.length > 0 ? (
                    <div className="max-h-[500px] overflow-y-auto">
                      {notifications.map((notification) => (
                        <DropdownMenuItem 
                          key={notification.id} 
                          className={`p-3 border-b last:border-0 cursor-pointer ${!notification.isRead ? 'bg-blue-50' : ''}`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="space-y-1 w-full">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-sm">{notification.title}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(notification.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <p className="text-sm text-gray-600">{notification.message}</p>
                            {notification.todo && (
                              <div className="mt-1 p-2 bg-gray-50 rounded text-xs">
                                <div className="flex items-center justify-between">
                                  <p className="font-medium">Task: {notification.todo.title}</p>
                                  <Badge variant={
                                    notification.todo.status === 'COMPLETED' ? 'success' : 
                                    notification.todo.status === 'IN_PROGRESS' ? 'warning' : 'default'
                                  }>
                                    {notification.todo.status.replace('_', ' ')}
                                  </Badge>
                                </div>
                                {notification.todo.dueDate && (
                                  <p className="mt-1">
                                    Due: {new Date(notification.todo.dueDate).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-sm text-gray-500">
                      No notifications
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.profilePic || ''} alt={user?.name} />
                      <AvatarFallback>
                        {user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user?.profilePic || ''} alt={user?.name} />
                      <AvatarFallback>
                        {user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                      {user?.role === 'ADMIN' && (
                        <Badge variant="secondary" className="w-fit">Admin</Badge>
                      )}
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      Profile Settings
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="cursor-pointer text-red-600"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}