'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, ArrowRight, ArrowLeft, Check, X } from 'lucide-react'
import Link from 'next/link'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Card, CardContent } from '../ui/Card'

interface ResetPasswordFormProps {
  onSubmit: (password: string) => Promise<void>
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

export const ResetPasswordForm = ({ onSubmit, loading = false }: ResetPasswordFormProps) => {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string; general?: string }>({})
  const [showPasswordHelp, setShowPasswordHelp] = useState(false)

  const validateForm = () => {
    const newErrors: { password?: string; confirmPassword?: string } = {}
    
    if (!password) {
      newErrors.password = 'Password is required'
    } else {
      const passwordChecks = [
        password.length >= 8,
        /[A-Z]/.test(password),
        /[a-z]/.test(password),
        /\d/.test(password),
        /[!@#$%^&*(),.?":{}|<>]/.test(password)
      ]
      
      if (!passwordChecks.every(check => check)) {
        newErrors.password = 'Password does not meet requirements'
      }
    }
    
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (password !== confirmPassword) {
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
      await onSubmit(password)
    } catch (error) {
      setErrors({ general: 'Failed to reset password. Please try again.' })
    }
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
          <h2 className="text-2xl font-bold text-white mb-2">Reset your password</h2>
          <p className="text-neutral-400">
            Enter your new password below.
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
              type="password"
              label="New Password"
              placeholder="Enter your new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setShowPasswordHelp(true)}
              onBlur={() => setShowPasswordHelp(false)}
              error={errors.password}
              leftIcon={<Lock className="w-5 h-5" />}
              autoComplete="new-password"
              disabled={loading}
            />
            {showPasswordHelp && <PasswordStrengthIndicator password={password} />}
          </div>
          
          <Input
            type="password"
            label="Confirm New Password"
            placeholder="Confirm your new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={errors.confirmPassword}
            leftIcon={<Lock className="w-5 h-5" />}
            autoComplete="new-password"
            disabled={loading}
          />
          
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
            loading={loading}
          >
            {loading ? 'Resetting...' : 'Reset password'}
            {!loading && <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
