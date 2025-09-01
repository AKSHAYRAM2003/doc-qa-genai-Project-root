'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Lock, User, ArrowRight, Check, X, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Card, CardContent } from '../ui/Card'

interface SignupFormProps {
  onSubmit: (data: {
    email: string
    password: string
    firstName: string
    lastName: string
  }) => Promise<void>
  loading?: boolean
}

const PasswordStrengthIndicator = ({ password }: { password: string }) => {
  const requirements = [
    { label: 'At least 8 characters', test: (pwd: string) => pwd.length >= 8 },
    { label: 'One uppercase letter', test: (pwd: string) => /[A-Z]/.test(pwd) },
    { label: 'One lowercase letter', test: (pwd: string) => /[a-z]/.test(pwd) },
    { label: 'One number', test: (pwd: string) => /\d/.test(pwd) },
    { label: 'One special character', test: (pwd: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd) },
  ]

  if (!password) return null

  return (
    <div className="mt-2 space-y-2">
      <p className="text-xs text-neutral-400 mb-2">Password requirements:</p>
      {requirements.map((req, index) => {
        const isValid = req.test(password)
        return (
          <motion.div
            key={index}
            className="flex items-center space-x-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            {isValid ? (
              <Check className="w-3 h-3 text-green-400" />
            ) : (
              <X className="w-3 h-3 text-neutral-500" />
            )}
            <span className={`text-xs ${isValid ? 'text-green-400' : 'text-neutral-500'}`}>
              {req.label}
            </span>
          </motion.div>
        )
      })}
    </div>
  )
}

export const SignupForm = ({ onSubmit, loading = false }: SignupFormProps) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: ''
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [showPasswordHelp, setShowPasswordHelp] = useState(false)

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}
    
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    } else if (!formData.email.toLowerCase().endsWith('@gmail.com')) {
      newErrors.email = 'Email must be from gmail.com domain'
    }
    
    if (!formData.firstName) {
      newErrors.firstName = 'First name is required'
    }
    
    if (!formData.lastName) {
      newErrors.lastName = 'Last name is required'
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else {
      const passwordChecks = [
        formData.password.length >= 8,
        /[A-Z]/.test(formData.password),
        /[a-z]/.test(formData.password),
        /\d/.test(formData.password),
        /[!@#$%^&*(),.?":{}|<>]/.test(formData.password)
      ]
      
      if (!passwordChecks.every(check => check)) {
        newErrors.password = 'Password does not meet requirements'
      }
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    
    if (!validateForm()) return
    
    try {
      await onSubmit({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName
      })
    } catch (error: any) {
      console.error('Signup error:', error)
      const errorMessage = error.message || 'Failed to create account. Please try again.'
      setErrors({ general: errorMessage })
    }
  }

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="text"
              label="First Name"
              placeholder="John"
              value={formData.firstName}
              onChange={(e) => updateFormData('firstName', e.target.value)}
              error={errors.firstName}
              leftIcon={<User className="w-5 h-5" />}
              autoComplete="given-name"
              disabled={loading}
            />
            
            <Input
              type="text"
              label="Last Name"
              placeholder="Doe"
              value={formData.lastName}
              onChange={(e) => updateFormData('lastName', e.target.value)}
              error={errors.lastName}
              leftIcon={<User className="w-5 h-5" />}
              autoComplete="family-name"
              disabled={loading}
            />
          </div>
          
          <div>
            <Input
              type="email"
              label="Email"
              placeholder="john.doe@gmail.com"
              value={formData.email}
              onChange={(e) => updateFormData('email', e.target.value)}
              error={errors.email}
              leftIcon={<Mail className="w-5 h-5" />}
              autoComplete="email"
              disabled={loading}
            />
            <p className="text-xs text-neutral-500 mt-1">
              📧 Only emails from gmail.com domain are allowed
            </p>
          </div>
          
          <div>
            <Input
              type="password"
              label="Password"
              placeholder="Create a strong password"
              value={formData.password}
              onChange={(e) => updateFormData('password', e.target.value)}
              onFocus={() => setShowPasswordHelp(true)}
              error={errors.password}
              leftIcon={<Lock className="w-5 h-5" />}
              autoComplete="new-password"
              disabled={loading}
            />
            {showPasswordHelp && (
              <PasswordStrengthIndicator password={formData.password} />
            )}
          </div>
          
          <Input
            type="password"
            label="Confirm Password"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={(e) => updateFormData('confirmPassword', e.target.value)}
            error={errors.confirmPassword}
            leftIcon={<Lock className="w-5 h-5" />}
            autoComplete="new-password"
            disabled={loading}
          />
          
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="terms"
              className="w-4 h-4 mt-0.5 text-neutral-600 bg-neutral-800 border-neutral-600 rounded focus:ring-neutral-500 focus:ring-2"
              required
            />
            <label htmlFor="terms" className="text-sm text-neutral-400 leading-relaxed">
              I agree to the{' '}
              <Link href="/terms" className="text-neutral-300 hover:text-neutral-100 underline">
                Terms of Service
              </Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-neutral-300 hover:text-neutral-100 underline">
                Privacy Policy
              </Link>
            </label>
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
              Create account
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </span>
          </Button>
        </form>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 pt-8 border-t border-neutral-700/50 text-center"
        >
          <p className="text-neutral-400">
            Already have an account?{' '}
            <Link 
              href="/auth/login" 
              className="text-neutral-100 hover:text-white font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
        </motion.div>
      </CardContent>
    </Card>
  )
}
