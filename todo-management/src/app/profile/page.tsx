'use client'

import { useState, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Camera, Save, User, Mail, Calendar, Shield, Lock } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordFormData, setPasswordFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || ''
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Name is required",
        variant: "destructive"
      })
      return
    }

    try {
      setLoading(true)
      await api.put(`/users/${user?.id}`, {
        name: formData.name,
        email: formData.email
      })

      toast({
        title: "Success",
        description: "Profile updated successfully"
      })

      // Refresh user data
      await refreshUser()
    } catch (error) {
      console.error('Failed to update profile:', error)
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Error",
        description: "Please select a valid image file (JPEG, PNG, GIF, or WebP)",
        variant: "destructive"
      })
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image size must be less than 5MB",
        variant: "destructive"
      })
      return
    }

    try {
      setUploadingImage(true)
      const formData = new FormData()
      formData.append('profilePicture', file)

      const response = await api.post('/users/profile-picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      toast({
        title: "Success",
        description: "Profile picture updated successfully"
      })

      // Refresh user data to get new profile picture
      await refreshUser()
    } catch (error) {
      console.error('Failed to upload profile picture:', error)
      toast({
        title: "Error",
        description: "Failed to upload profile picture",
        variant: "destructive"
      })
    } finally {
      setUploadingImage(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-600">Manage your account settings and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Picture Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Profile Picture
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="relative inline-block">
                <Avatar className="w-32 h-32 mx-auto">
                  <AvatarImage src={user?.profilePic ? `/api${user.profilePic}` : ''} />
                  <AvatarFallback className="text-2xl">
                    {user?.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="sm"
                  className="absolute bottom-0 right-0 rounded-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                >
                  <Camera className="w-4 h-4" />
                </Button>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              
              <div className="text-sm text-gray-500">
                <p>Click the camera icon to upload a new picture</p>
                <p>Max size: 5MB. Formats: JPEG, PNG, GIF, WebP</p>
              </div>
              
              {uploadingImage && (
                <p className="text-sm text-blue-600">Uploading...</p>
              )}
            </CardContent>
          </Card>

          {/* Profile Information */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full md:w-auto">
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Updating...' : 'Update Profile'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center space-x-3">
                <Shield className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Role</p>
                  <Badge variant={user?.role === 'ADMIN' ? 'default' : 'secondary'}>
                    {user?.role}
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Member Since</p>
                  <p className="text-sm text-gray-500">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Account Status</p>
                  <p className="text-sm text-gray-500">Active</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">Password</p>
                  <p className="text-sm text-gray-500">Last changed: Never</p>
                </div>
                <Button variant="outline" onClick={() => setShowPasswordModal(true)}>
                  Change Password
                </Button>
              </div>
              
              {/* 2FA feature removed as requested */}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Password Change Modal */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new password.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                placeholder="Enter your current password"
                value={passwordFormData.currentPassword}
                onChange={(e) => setPasswordFormData(prev => ({
                  ...prev,
                  currentPassword: e.target.value
                }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Enter your new password"
                value={passwordFormData.newPassword}
                onChange={(e) => setPasswordFormData(prev => ({
                  ...prev,
                  newPassword: e.target.value
                }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Confirm your new password"
                value={passwordFormData.confirmPassword}
                onChange={(e) => setPasswordFormData(prev => ({
                  ...prev,
                  confirmPassword: e.target.value
                }))}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handlePasswordChange} 
              disabled={passwordLoading}
              className="ml-2"
            >
              <Lock className="w-4 h-4 mr-2" />
              {passwordLoading ? 'Updating...' : 'Update Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )

  // Password change handler
  function handlePasswordChange() {
    // Validate inputs
    if (!passwordFormData.currentPassword) {
      toast({
        title: "Error",
        description: "Current password is required",
        variant: "destructive"
      });
      return;
    }

    if (!passwordFormData.newPassword) {
      toast({
        title: "Error",
        description: "New password is required",
        variant: "destructive"
      });
      return;
    }

    if (passwordFormData.newPassword.length < 8) {
      toast({
        title: "Error",
        description: "New password must be at least 8 characters long",
        variant: "destructive"
      });
      return;
    }

    if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }

    // Submit password change request
    setPasswordLoading(true);
    api.put(`/users/${user?.id}/password`, {
      currentPassword: passwordFormData.currentPassword,
      newPassword: passwordFormData.newPassword
    })
    .then(() => {
      toast({
        title: "Success",
        description: "Password changed successfully"
      });
      
      // Reset form and close modal
      setPasswordFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordModal(false);
    })
    .catch(error => {
      console.error("Password change error:", error);
      const errorMessage = error.response?.data?.error?.message || "Failed to change password";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    })
    .finally(() => {
      setPasswordLoading(false);
    });
  }
}