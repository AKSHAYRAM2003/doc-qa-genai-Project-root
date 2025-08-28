'use client'

import { motion } from 'framer-motion'
import { clsx } from 'clsx'
import { forwardRef } from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: React.ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading = false, disabled, children, ...props }, ref) => {
    const baseClasses = clsx(
      'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-950',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'relative overflow-hidden',
      {
        // Variants
        'bg-neutral-100 text-neutral-900 hover:bg-neutral-200 focus:ring-neutral-400 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]': variant === 'primary',
        'bg-neutral-800 text-neutral-100 hover:bg-neutral-700 focus:ring-neutral-600 border border-neutral-700': variant === 'secondary',
        'text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800/50 focus:ring-neutral-600': variant === 'ghost',
        'border border-neutral-600 text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800/30 focus:ring-neutral-600': variant === 'outline',
        
        // Sizes
        'h-8 px-3 text-sm': size === 'sm',
        'h-10 px-4 text-sm': size === 'md',
        'h-12 px-6 text-base': size === 'lg',
      },
      className
    )

    return (
      <motion.button
        ref={ref}
        className={baseClasses}
        disabled={disabled || loading}
        whileTap={{ scale: variant === 'primary' ? 0.98 : 1 }}
        {...(props as any)}
      >
        {loading && (
          <motion.div
            className="mr-2"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </motion.div>
        )}
        {children}
      </motion.button>
    )
  }
)

Button.displayName = 'Button'
