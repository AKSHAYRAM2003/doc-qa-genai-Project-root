'use client'

import { motion } from 'framer-motion'
import { clsx } from 'clsx'

interface CardProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'glass' | 'gradient'
}

export const Card = ({ children, className, variant = 'glass' }: CardProps) => {
  const cardClasses = clsx(
    'rounded-2xl border backdrop-blur-xl',
    {
      'bg-neutral-900/80 border-neutral-700': variant === 'default',
      'bg-neutral-900/30 border-neutral-700/50 backdrop-blur-2xl': variant === 'glass',
      'bg-gradient-to-br from-neutral-900/90 to-neutral-800/90 border-neutral-700/30': variant === 'gradient',
    },
    className
  )

  return (
    <motion.div
      className={cardClasses}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {children}
    </motion.div>
  )
}

interface CardHeaderProps {
  children: React.ReactNode
  className?: string
}

export const CardHeader = ({ children, className }: CardHeaderProps) => {
  return (
    <div className={clsx('p-8 pb-4', className)}>
      {children}
    </div>
  )
}

interface CardContentProps {
  children: React.ReactNode
  className?: string
}

export const CardContent = ({ children, className }: CardContentProps) => {
  return (
    <div className={clsx('p-8 pt-4', className)}>
      {children}
    </div>
  )
}

interface CardFooterProps {
  children: React.ReactNode
  className?: string
}

export const CardFooter = ({ children, className }: CardFooterProps) => {
  return (
    <div className={clsx('p-8 pt-4 border-t border-neutral-700/50', className)}>
      {children}
    </div>
  )
}
