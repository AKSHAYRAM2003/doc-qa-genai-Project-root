'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Card, CardContent } from '../ui/Card'

interface ForgotPasswordFormProps {
  onSubmit: (email: string) => Promise<void>
  loading?: boolean
}

export const ForgotPasswordForm = ({ onSubmit, loading = false }: ForgotPasswordFormProps) => {
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<{ email?: string; general?: string }>({})
  const [isSubmitted, setIsSubmitted] = useState(false)

  const validateForm = () => {
    const newErrors: { email?: string } = {}
    
    if (!email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email'
    } else if (!email.toLowerCase().endsWith('@gmail.com')) {
      newErrors.email = 'Email must be from gmail.com domain'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    
    if (!validateForm()) return
    
    try {
      await onSubmit(email)
      setIsSubmitted(true)
    } catch (error) {
      setErrors({ general: 'Failed to send reset email. Please try again.' })
    }
  }

  if (isSubmitted) {
    return (
      <Card variant="glass">
        <CardContent className="p-8">
          {/* Back to Login Button */}
          <div className="mb-6">
            <Link href="/auth/login">
              <Button 
                variant="ghost" 
                size="sm"
                className="group p-0 h-auto text-neutral-400 hover:text-neutral-100"
              >
                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                Back to login
              </Button>
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle className="w-8 h-8 text-green-400" />
            </motion.div>
            
            <h2 className="text-2xl font-bold text-white mb-4">Check your email</h2>
            <p className="text-neutral-400 mb-6">
              If an account with <span className="text-white font-medium">{email}</span> exists, 
              we've sent you a password reset link.
            </p>
            <p className="text-sm text-neutral-500">
              Don't see the email? Check your spam folder or try again.
            </p>
          </motion.div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant="glass">
      <CardContent className="p-8">
        {/* Back to Login Button */}
        <div className="mb-6">
          <Link href="/auth/login">
            <Button 
              variant="ghost" 
              size="sm"
              className="group p-0 h-auto text-neutral-400 hover:text-neutral-100"
            >
              <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to login
            </Button>
          </Link>
        </div>
        
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Forgot your password?</h2>
          <p className="text-neutral-400">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.general && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl"
            >
              <p className="text-red-400 text-sm text-center">{errors.general}</p>
            </motion.div>
          )}
          
          <div>
            <Input
              type="email"
              label="Email"
              placeholder="your.email@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              leftIcon={<Mail className="w-5 h-5" />}
              autoComplete="email"
              disabled={loading}
            />
            <p className="text-xs text-neutral-500 mt-1">
              📧 Only emails from gmail.com domain are allowed
            </p>
          </div>
          
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
            loading={loading}
          >
            {loading ? 'Sending...' : 'Send reset link'}
            {!loading && <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />}
          </Button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-neutral-400">
            Remember your password?{' '}
            <Link href="/auth/login" className="text-purple-400 hover:text-purple-300 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
