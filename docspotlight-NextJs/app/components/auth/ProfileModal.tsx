'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, User, Mail, Lock, Edit2, Save, LogOut } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { useAuth } from '../../contexts/AuthContext'

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
}

export const ProfileModal = ({ isOpen, onClose }: ProfileModalProps) => {
  const { user, logout, updateProfile, changePassword } = useAuth()
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile')
  const [loading, setLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  
  // Profile form state
  const [profileData, setProfileData] = useState({
    firstName: user?.first_name || '',
    lastName: user?.last_name || ''
  })
  
  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [success, setSuccess] = useState('')

  if (!user) return null

  const handleProfileUpdate = async () => {
    setLoading(true)
    setErrors({})
    setSuccess('')
    
    try {
      if (!profileData.firstName.trim()) {
        setErrors({ firstName: 'First name is required' })
        return
      }
      
      if (!profileData.lastName.trim()) {
        setErrors({ lastName: 'Last name is required' })
        return
      }
      
      await updateProfile(profileData.firstName.trim(), profileData.lastName.trim())
      setEditMode(false)
      setSuccess('Profile updated successfully!')
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      setErrors({ general: error instanceof Error ? error.message : 'Failed to update profile' })
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async () => {
    setLoading(true)
    setErrors({})
    setSuccess('')
    
    try {
      const newErrors: { [key: string]: string } = {}
      
      if (!passwordData.currentPassword) {
        newErrors.currentPassword = 'Current password is required'
      }
      
      if (!passwordData.newPassword) {
        newErrors.newPassword = 'New password is required'
      } else {
        const passwordChecks = [
          passwordData.newPassword.length >= 8,
          /[A-Z]/.test(passwordData.newPassword),
          /[a-z]/.test(passwordData.newPassword),
          /\d/.test(passwordData.newPassword),
          /[!@#$%^&*(),.?":{}|<>]/.test(passwordData.newPassword)
        ]
        
        if (!passwordChecks.every(check => check)) {
          newErrors.newPassword = 'Password must meet requirements'
        }
      }
      
      if (!passwordData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your new password'
      } else if (passwordData.newPassword !== passwordData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match'
      }
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors)
        return
      }
      
      await changePassword(passwordData.currentPassword, passwordData.newPassword)
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      setSuccess('Password changed successfully!')
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      setErrors({ general: error instanceof Error ? error.message : 'Failed to change password' })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-neutral-900/95 backdrop-blur border border-neutral-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-neutral-800">
                <h2 className="text-xl font-semibold text-white">Profile Settings</h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-neutral-800 transition-colors"
                >
                  <X className="w-5 h-5 text-neutral-400" />
                </button>
              </div>
              
              {/* Tabs */}
              <div className="flex border-b border-neutral-800">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'profile'
                      ? 'text-white border-b-2 border-purple-400'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Profile
                </button>
                <button
                  onClick={() => setActiveTab('password')}
                  className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'password'
                      ? 'text-white border-b-2 border-purple-400'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Password
                </button>
              </div>
              
              {/* Content */}
              <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg"
                  >
                    <p className="text-green-400 text-sm text-center">{success}</p>
                  </motion.div>
                )}
                
                {errors.general && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
                  >
                    <p className="text-red-400 text-sm text-center">{errors.general}</p>
                  </motion.div>
                )}
                
                {activeTab === 'profile' && (
                  <div className="space-y-4">
                    {/* User Info */}
                    <div className="flex items-center gap-4 p-4 bg-neutral-800/50 rounded-lg">
                      <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-medium text-white">
                          {user.first_name} {user.last_name}
                        </h3>
                        <p className="text-sm text-neutral-400">{user.email}</p>
                      </div>
                    </div>
                    
                    {/* Profile Form */}
                    {editMode ? (
                      <div className="space-y-4">
                        <Input
                          type="text"
                          label="First Name"
                          value={profileData.firstName}
                          onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                          error={errors.firstName}
                          leftIcon={<User className="w-5 h-5" />}
                          disabled={loading}
                        />
                        
                        <Input
                          type="text"
                          label="Last Name"
                          value={profileData.lastName}
                          onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                          error={errors.lastName}
                          leftIcon={<User className="w-5 h-5" />}
                          disabled={loading}
                        />
                        
                        <div className="flex gap-3">
                          <Button
                            onClick={handleProfileUpdate}
                            disabled={loading}
                            loading={loading}
                            className="flex-1"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setEditMode(false)
                              setProfileData({
                                firstName: user?.first_name || '',
                                lastName: user?.last_name || ''
                              })
                              setErrors({})
                            }}
                            disabled={loading}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        onClick={() => setEditMode(true)}
                        variant="ghost"
                        className="w-full"
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit Profile
                      </Button>
                    )}
                  </div>
                )}
                
                {activeTab === 'password' && (
                  <div className="space-y-4">
                    <Input
                      type="password"
                      label="Current Password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      error={errors.currentPassword}
                      leftIcon={<Lock className="w-5 h-5" />}
                      disabled={loading}
                    />
                    
                    <Input
                      type="password"
                      label="New Password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      error={errors.newPassword}
                      leftIcon={<Lock className="w-5 h-5" />}
                      disabled={loading}
                    />
                    
                    <Input
                      type="password"
                      label="Confirm New Password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      error={errors.confirmPassword}
                      leftIcon={<Lock className="w-5 h-5" />}
                      disabled={loading}
                    />
                    
                    <Button
                      onClick={handlePasswordChange}
                      disabled={loading}
                      loading={loading}
                      className="w-full"
                    >
                      Change Password
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div className="p-6 border-t border-neutral-800">
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="w-full text-red-400 border-red-400/20 hover:bg-red-400/10"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
