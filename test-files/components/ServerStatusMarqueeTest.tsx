'use client'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

export const ServerStatusMarqueeTest = () => {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isVisible, setIsVisible] = useState(true)
  const [forceShow, setForceShow] = useState(true) // Force show for testing

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      setCurrentTime(now)
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  if (!isVisible) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="relative transition-all duration-500 bg-gradient-to-r from-purple-500/15 via-pink-500/15 to-red-500/15 border-b border-purple-500/30 backdrop-blur-sm"
    >
      {/* Close button */}
      <button
        onClick={() => setIsVisible(false)}
        className="absolute top-2 right-2 text-gray-400 hover:text-white hover:bg-red-500/80 rounded-full p-1 transition-all duration-200 z-10 backdrop-blur-sm"
        aria-label="Close notification"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Toggle button for testing */}
      <button
        onClick={() => setForceShow(!forceShow)}
        className="absolute top-2 right-8 text-xs text-gray-400 hover:text-white transition-colors bg-gray-800/50 px-2 py-1 rounded backdrop-blur-sm"
      >
        {forceShow ? 'Hide' : 'Show'}
      </button>

      {/* Time display */}
      <div className="absolute top-2 left-2 text-xs text-gray-300 font-mono hidden sm:block">
        {formatTime(currentTime)}
      </div>

      <div className="relative overflow-hidden py-3 px-8">
        <motion.div
          animate={{ x: ['100%', '-100%'] }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: 'linear'
          }}
          className="whitespace-nowrap"
        >
          <span className="inline-flex items-center gap-4 text-sm font-medium">
            <span className="flex h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
            
            {/* Mobile-responsive content */}
            <span className="text-purple-200">
              <span className="hidden lg:inline">🚧 Maintenance Window Active (12:00 AM - 7:00 AM)</span>
              <span className="hidden md:inline lg:hidden">🚧 Maintenance Active (12AM-7AM)</span>
              <span className="md:hidden">🚧 Limited Service</span>
            </span>
            
            <span className="text-gray-400 hidden sm:inline">•</span>
            
            <span className="text-pink-200">
              <span className="hidden lg:inline">📉 Server scaled down for cost optimization</span>
              <span className="hidden md:inline lg:hidden">📉 Cost optimization mode</span>
              <span className="md:hidden">📉 Scaled down</span>
            </span>
            
            <span className="text-gray-400 hidden md:inline">•</span>
            
            <span className="text-red-200 hidden md:inline">
              <span className="hidden lg:inline">⚡ Some features may respond slower than usual</span>
              <span className="lg:hidden">⚡ Slower response times</span>
            </span>
            
            <span className="text-gray-400 hidden lg:inline">•</span>
            
            <span className="text-purple-300 hidden lg:inline">
              💡 Full service resumes at 7:00 AM
            </span>
            
            <span className="flex h-2 w-2 rounded-full bg-purple-400 animate-pulse ml-4" />
          </span>
        </motion.div>
      </div>

      {/* Bottom gradient line for extra visual appeal */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-400/50 to-transparent" />
    </motion.div>
  )
}
