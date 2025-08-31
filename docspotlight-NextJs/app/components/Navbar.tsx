'use client'

import { motion } from 'framer-motion'
import { LogIn, User } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '../contexts/AuthContext'
import { UserAvatar } from './auth/UserAvatar'
import { Button } from './ui/Button'

interface NavbarProps {
  variant?: 'hero' | 'chat'
  className?: string
}

export const Navbar = ({ variant = 'hero', className = '' }: NavbarProps) => {
  const { isAuthenticated, user, loading } = useAuth()

  const navbarClasses = `flex items-center justify-between w-full ${
    variant === 'hero' 
      ? 'p-6 lg:p-8' 
      : 'p-4 border-b border-neutral-800/50 bg-neutral-950/80 backdrop-blur-xl'
  } ${className}`

  return (
    <motion.nav
      className={navbarClasses}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Logo/Brand - Hidden on mobile */}
      <Link href="/" className="hidden md:flex items-center space-x-3 group">
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Image
            src="/logo-white.svg"
            alt="DocSpotlight"
            width={variant === 'hero' ? 40 : 32}
            height={variant === 'hero' ? 40 : 32}
            className="transition-transform group-hover:scale-105"
          />
        </motion.div>
        
        <div className="hidden sm:block">
          <h1 className={`font-heading text-white group-hover:text-neutral-200 transition-colors ${
            variant === 'hero' ? 'text-xl' : 'text-lg'
          }`}>
            DocSpotlight
          </h1>
          {variant === 'hero' && (
            <p className="text-xs text-neutral-400 font-body">
              AI-powered document chat
            </p>
          )}
        </div>
      </Link>

      {/* Mobile: Empty div to maintain space-between layout */}
      <div className="md:hidden"></div>

      {/* Right side - Auth section */}
      <div className="flex items-center space-x-3">
        {loading ? (
          <div className="w-8 h-8 flex items-center justify-center">
            <motion.div
              className="w-4 h-4 border-2 border-neutral-600 border-t-neutral-300 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
        ) : isAuthenticated ? (
          <div className="flex items-center space-x-3">
            {/* Welcome message - hidden on small screens */}
            <div className="hidden md:block text-right">
              <p className="text-sm text-neutral-300">
                Welcome back,{' '}
                <span className="text-neutral-100 font-medium">
                  {user?.first_name || user?.email?.split('@')[0]}
                </span>
              </p>
            </div>
            
            <UserAvatar />
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            {/* Mobile auth buttons - show directly, no menu */}
            <div className="flex items-center space-x-2">
              {/* Login Button - always visible */}
              <Link href="/auth/login">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="group"
                >
                  <LogIn className="w-4 h-4 gap-1 md:mr-2 group-hover:scale-110 transition-transform" />
                  <span className=" md:inline">Login</span>
                </Button>
              </Link>
              
              {/* Signup Button - only show on hero variant */}
              {variant === 'hero' && (
                <Link href="/auth/signup">
                  <Button 
                    variant="primary" 
                    size="sm"
                    className="group"
                  >
                    <User className="w-4 h-4 md:mr-2 group-hover:scale-110 transition-transform" />
                    <span className=" md:inline gap-1">Sign up</span>
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.nav>
  )
}
