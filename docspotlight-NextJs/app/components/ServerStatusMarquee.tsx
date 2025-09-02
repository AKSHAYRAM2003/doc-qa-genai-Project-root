'use client'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

export const ServerStatusMarquee = () => {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isMaintenanceWindow, setIsMaintenanceWindow] = useState(false)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      setCurrentTime(now)
      
      // Check if current time is between 12:00 AM and 7:00 AM
      const hour = now.getHours()
      setIsMaintenanceWindow(hour >= 0 && hour < 7)
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

  if (!isMaintenanceWindow || !isVisible) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`relative transition-all duration-500 ${
        isMaintenanceWindow 
          ? 'bg-gradient-to-r from-purple-500/15 via-pink-500/15 to-red-500/15 border-b border-purple-500/30' 
          : 'bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-cyan-500/15 border-b border-emerald-500/30'
      } backdrop-blur-sm`}
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
            <span className={`flex h-2 w-2 rounded-full ${
              isMaintenanceWindow ? 'bg-purple-400' : 'bg-emerald-400'
            } animate-pulse`} />
            
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
            
            <span className={`flex h-2 w-2 rounded-full ${
              isMaintenanceWindow ? 'bg-purple-400' : 'bg-emerald-400'
            } animate-pulse ml-4`} />
          </span>
        </motion.div>
      </div>

      {/* Bottom gradient line for extra visual appeal */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-400/50 to-transparent" />
    </motion.div>
  )
}

export const ServerStatusBanner = () => {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isMaintenanceWindow, setIsMaintenanceWindow] = useState(false)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      setCurrentTime(now)
      
      // Check if current time is between 12:00 AM and 7:00 AM
      const hour = now.getHours()
      setIsMaintenanceWindow(hour >= 0 && hour < 7)
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
  }

  if (!isVisible) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative transition-all duration-500 ${
        isMaintenanceWindow 
          ? 'bg-gradient-to-r from-purple-500/15 via-pink-500/15 to-red-500/15 border-b border-purple-500/30' 
          : 'bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border-b border-emerald-500/20'
      } backdrop-blur-sm`}
    >
      {/* Close button */}
      <button
        onClick={() => setIsVisible(false)}
        className="absolute top-2 right-2 text-gray-400 hover:text-white hover:bg-red-500 rounded-full p-1 transition-colors z-10"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="max-w-7xl mx-auto px-4 py-3 pr-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-3 w-3 rounded-full ${
              isMaintenanceWindow ? 'bg-purple-400' : 'bg-emerald-400'
            } animate-pulse`} />
            <span className={`text-sm font-medium ${
              isMaintenanceWindow ? 'text-purple-200' : 'text-emerald-200'
            }`}>
              {isMaintenanceWindow ? (
                <>
                  <span className="hidden sm:inline">🚧 Maintenance Window Active</span>
                  <span className="sm:hidden">🚧 Limited Service</span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">✅ All Systems Operational</span>
                  <span className="sm:hidden">✅ Online</span>
                </>
              )}
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400 hidden md:block">
              Server scales down 12:00 AM - 7:00 AM (Cost Optimization)
            </span>
            <span className="text-xs text-gray-300 font-mono">
              {formatTime(currentTime)}
            </span>
          </div>
        </div>
        
        {isMaintenanceWindow && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-2 pt-2 border-t border-purple-500/20"
          >
            <p className="text-xs text-purple-200/80 text-center">
              📱 Our GCP servers are scaled down during low-traffic hours to optimize costs. 
              <span className="hidden sm:inline"> Some features may respond slower than usual.</span>
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
