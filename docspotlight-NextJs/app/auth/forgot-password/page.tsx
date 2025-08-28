'use client'

import { useState } from 'react'
import { AuthLayout } from '../../components/auth/AuthLayout'
import { ForgotPasswordForm } from '../../components/auth/ForgotPasswordForm'

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)

  const handleForgotPassword = async (email: string) => {
    setLoading(true)
    
    try {
      const response = await fetch('http://localhost:8000/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        throw new Error('Failed to send reset email')
      }

      // The API always returns success for security reasons
    } catch (error) {
      console.error('Forgot password error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="We'll send you a link to reset your password"
    >
      <ForgotPasswordForm onSubmit={handleForgotPassword} loading={loading} />
    </AuthLayout>
  )
}
