'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  user_id: string
  email: string
  first_name?: string
  last_name?: string
  is_verified: boolean
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>
  logout: () => void
  updateProfile: (firstName: string, lastName: string) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Check if user is logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('access_token')
        const userData = localStorage.getItem('user')
        
        if (token && userData) {
          // Verify token is still valid
          const response = await fetch('http://localhost:8000/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          })
          
          if (response.ok) {
            const validatedUser = await response.json()
            setUser(validatedUser)
          } else {
            // Token is invalid, clear storage
            localStorage.removeItem('access_token')
            localStorage.removeItem('refresh_token')
            localStorage.removeItem('user')
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        // Clear potentially corrupted data
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    const response = await fetch('http://localhost:8000/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      throw new Error('Login failed')
    }

    const data = await response.json()
    
    // Store tokens
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('refresh_token', data.refresh_token)
    localStorage.setItem('user', JSON.stringify(data.user))
    
    setUser(data.user)
  }

  const register = async (email: string, password: string, firstName?: string, lastName?: string) => {
    const response = await fetch('http://localhost:8000/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        email, 
        password, 
        first_name: firstName, 
        last_name: lastName 
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || 'Registration failed')
    }

    const data = await response.json()
    
    // After successful registration, automatically log them in
    await login(email, password)
  }

  const updateProfile = async (firstName: string, lastName: string) => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      throw new Error('No access token found')
    }

    const response = await fetch('http://localhost:8000/auth/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ 
        first_name: firstName, 
        last_name: lastName 
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || 'Profile update failed')
    }

    const updatedUser = await response.json()
    setUser(updatedUser)
    localStorage.setItem('user', JSON.stringify(updatedUser))
  }

  const changePassword = async (currentPassword: string, newPassword: string) => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      throw new Error('No access token found')
    }

    const response = await fetch('http://localhost:8000/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ 
        current_password: currentPassword, 
        new_password: newPassword 
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || 'Password change failed')
    }
  }

  const logout = () => {
    // Only remove auth tokens, preserve chat data 
    // (chat data for authenticated users is now stored in backend)
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    setUser(null)
    router.push('/auth/login')
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    isAuthenticated: !!user,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
