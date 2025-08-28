'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthLayout } from '../../components/auth/AuthLayout'
import { LoginForm } from '../../components/auth/LoginForm'
import { useAuth } from '../../contexts/AuthContext'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { login } = useAuth()

  const handleLogin = async (email: string, password: string) => {
    setLoading(true)
    
    try {
      await login(email, password)
      router.push('/')
    } catch (error) {
      console.error('Login error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your DocSpotlight account"
    >
      <LoginForm onSubmit={handleLogin} loading={loading} />
    </AuthLayout>
  )
}
