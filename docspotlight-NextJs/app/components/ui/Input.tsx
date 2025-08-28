'use client'

import { motion } from 'framer-motion'
import { clsx } from 'clsx'
import { forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, helperText, leftIcon, rightIcon, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false)
    const [isFocused, setIsFocused] = useState(false)

    const isPassword = type === 'password'
    const inputType = isPassword && showPassword ? 'text' : type

    const inputClasses = clsx(
      'w-full px-4 py-3 bg-neutral-900/50 border border-neutral-700 rounded-xl',
      'text-neutral-100 placeholder-neutral-500',
      'transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:border-transparent',
      'hover:border-neutral-600',
      'backdrop-blur-sm',
      {
        'border-red-500 focus:ring-red-400': error,
        'pl-12': leftIcon,
        'pr-12': rightIcon || isPassword,
      },
      className
    )

    return (
      <div className="space-y-2">
        {label && (
          <motion.label
            className="block text-sm font-medium text-neutral-300"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {label}
          </motion.label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-neutral-500">
              {leftIcon}
            </div>
          )}
          
          <motion.input
            ref={ref}
            type={inputType}
            className={inputClasses}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            whileFocus={{ scale: 1.01 }}
            transition={{ duration: 0.1 }}
            {...(props as any)}
          />
          
          {isPassword && (
            <button
              type="button"
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          )}
          
          {rightIcon && !isPassword && (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-neutral-500">
              {rightIcon}
            </div>
          )}
        </div>
        
        {error && (
          <motion.p
            className="text-sm text-red-400"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.2 }}
          >
            {error}
          </motion.p>
        )}
        
        {helperText && !error && (
          <p className="text-sm text-neutral-500">{helperText}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
