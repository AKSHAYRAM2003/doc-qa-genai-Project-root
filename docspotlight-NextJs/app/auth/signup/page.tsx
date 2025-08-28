'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthLayout } from '../../components/auth/AuthLayout'
import { SignupForm } from '../../components/auth/SignupForm'
import { useAuth } from '../../contexts/AuthContext'

export default function SignupPage() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { register } = useAuth()

  const handleSignup = async (data: {
    email: string
    password: string
    firstName: string
    lastName: string
  }) => {
    setLoading(true)
    
    try {
      await register(data.email, data.password, data.firstName, data.lastName)
      router.push('/')
    } catch (error) {
      console.error('Signup failed:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join DocSpotlight and start chatting with your documents"
    >
      <SignupForm onSubmit={handleSignup} loading={loading} />
    </AuthLayout>
  )
}
