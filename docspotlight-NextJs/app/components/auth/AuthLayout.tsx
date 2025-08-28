'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

export const AuthLayout = ({ children, title, subtitle }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen bg-neutral-950 flex">
      {/* Left side - Brand/Visual */}
      <div className="hidden lg:flex lg:flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 to-neutral-800" />
        
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 0%, transparent 50%),
                             radial-gradient(circle at 75% 75%, rgba(255,255,255,0.05) 0%, transparent 50%)`
          }} />
        </div>
        
        <div className="relative z-10 flex flex-col justify-center items-center p-12 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <Image
              src="/logo-white.svg"
              alt="DocSpotlight"
              width={80}
              height={80}
              className="mb-8"
            />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h1 className="text-4xl font-heading text-white mb-4">
              DocSpotlight
            </h1>
            <p className="text-xl text-neutral-300 font-body leading-relaxed max-w-md">
              Transform your documents into intelligent conversations with AI-powered insights
            </p>
          </motion.div>
          
          <motion.div
            className="mt-12 grid grid-cols-1 gap-6 max-w-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="flex items-center space-x-3 text-neutral-300">
              <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-green-400" />
              </div>
              <span className="text-sm">Upload PDFs instantly</span>
            </div>
            <div className="flex items-center space-x-3 text-neutral-300">
              <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
              </div>
              <span className="text-sm">Chat with your documents</span>
            </div>
            <div className="flex items-center space-x-3 text-neutral-300">
              <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-purple-400" />
              </div>
              <span className="text-sm">Get intelligent answers</span>
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Right side - Form */}
      <div className="flex-1 lg:flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Image
              src="/logo-white.svg"
              alt="DocSpotlight"
              width={60}
              height={60}
              className="mx-auto mb-4"
            />
            <h1 className="text-2xl font-heading text-white">DocSpotlight</h1>
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h2 className="text-3xl font-heading text-white mb-2">{title}</h2>
            {subtitle && (
              <p className="text-neutral-400 font-body">{subtitle}</p>
            )}
          </motion.div>
          
          {children}
        </div>
      </div>
    </div>
  )
}
