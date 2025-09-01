'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Lock, ArrowRight, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Card, CardContent } from '../ui/Card'

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>
  loading?: boolean
}

export const LoginForm = ({ onSubmit, loading = false }: LoginFormProps) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({})

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {}
    
    if (!email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email'
    } else if (!email.toLowerCase().endsWith('@gmail.com')) {
      newErrors.email = 'Email must be from gmail.com domain'
    }
    
    if (!password) {
      newErrors.password = 'Password is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    
    if (!validateForm()) return
    
    try {
      await onSubmit(email, password)
    } catch (error: any) {
      console.error('Login error:', error)
      const errorMessage = error.message || 'Invalid email or password. Please try again.'
      setErrors({ general: errorMessage })
    }
  }

  return (
    <Card variant="glass">
      <CardContent className="p-8">
        {/* Back to Home Button */}
        <div className="mb-6">
          <Link href="/">
            <Button 
              variant="ghost" 
              size="sm"
              className="group p-0 h-auto text-neutral-400 hover:text-neutral-100"
            >
              <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to home
            </Button>
          </Link>
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
          
          <div className="space-y-4">
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
            
            <Input
              type="password"
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              leftIcon={<Lock className="w-5 h-5" />}
              autoComplete="current-password"
              disabled={loading}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="w-4 h-4 text-neutral-600 bg-neutral-800 border-neutral-600 rounded focus:ring-neutral-500 focus:ring-2"
              />
              <span className="ml-2 text-sm text-neutral-400">Remember me</span>
            </label>
            
            <Link 
              href="/auth/forgot-password" 
              className="text-sm text-neutral-300 hover:text-neutral-100 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            disabled={loading}
            className="w-full group"
          >
            <span className="flex items-center justify-center">
              Sign in
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </span>
          </Button>
        </form>
        
        <div className="mt-4 text-center">
          <Link 
            href="/auth/forgot-password" 
            className="text-sm text-neutral-400 hover:text-neutral-100 transition-colors"
          >
            Forgot your password?
          </Link>
        </div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 pt-8 border-t border-neutral-700/50 text-center"
        >
          <p className="text-neutral-400">
            Don't have an account?{' '}
            <Link 
              href="/auth/signup" 
              className="text-neutral-100 hover:text-white font-medium transition-colors"
            >
              Sign up
            </Link>
          </p>
        </motion.div>
      </CardContent>
    </Card>
  )
}
