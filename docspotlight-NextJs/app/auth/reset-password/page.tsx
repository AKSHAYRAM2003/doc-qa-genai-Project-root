'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthLayout } from '../../components/auth/AuthLayout'
import { ResetPasswordForm } from '../../components/auth/ResetPasswordForm'

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    if (!tokenParam) {
      router.push('/auth/login')
      return
    }
    setToken(tokenParam)
  }, [searchParams, router])

  const handleResetPassword = async (password: string) => {
    if (!token) {
      throw new Error('No reset token found')
    }

    setLoading(true)
    
    try {
      const response = await fetch('http://localhost:8000/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          token, 
          new_password: password 
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to reset password')
      }

      // Redirect to login with success message
      router.push('/auth/login?message=Password reset successfully. Please log in with your new password.')
    } catch (error) {
      console.error('Reset password error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return null // Will redirect to login
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your new password below"
    >
      <ResetPasswordForm onSubmit={handleResetPassword} loading={loading} />
    </AuthLayout>
  )
}
