'use client'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

export const ServerStatusDemo = () => {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [forceMaintenanceMode, setForceMaintenanceMode] = useState(false)
  const [isMaintenanceWindow, setIsMaintenanceWindow] = useState(false)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      setCurrentTime(now)
      
      // Check if current time is between 12:00 AM and 7:00 AM OR if forced
      const hour = now.getHours()
      setIsMaintenanceWindow((hour >= 0 && hour < 7) || forceMaintenanceMode)
    }, 1000)

    return () => clearInterval(timer)
  }, [forceMaintenanceMode])

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
          ? 'bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-red-500/15 border-b border-amber-500/30' 
          : 'bg-gradient-to-r from-green-500/10 via-blue-500/10 to-purple-500/10 border-b border-green-500/20'
      } backdrop-blur-sm`}
    >
      {/* Close button */}
      <button
        onClick={() => setIsVisible(false)}
        className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors z-10"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Demo toggle button */}
      <button
        onClick={() => setForceMaintenanceMode(!forceMaintenanceMode)}
        className="absolute top-2 right-8 text-xs text-gray-400 hover:text-white transition-colors bg-gray-800 px-2 py-1 rounded"
      >
        Demo: {forceMaintenanceMode ? 'Maintenance' : 'Normal'}
      </button>

      <div className="max-w-7xl mx-auto px-4 py-3 pr-16">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-3 w-3 rounded-full ${
              isMaintenanceWindow ? 'bg-amber-400' : 'bg-green-400'
            } animate-pulse`} />
            <span className={`text-sm font-medium ${
              isMaintenanceWindow ? 'text-amber-200' : 'text-green-200'
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
            className="mt-2 pt-2 border-t border-amber-500/20"
          >
            <p className="text-xs text-amber-200/80 text-center">
              📱 Our GCP servers are scaled down during low-traffic hours to optimize costs. 
              <span className="hidden sm:inline"> Some features may respond slower than usual.</span>
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

export const ServerStatusMarqueeDemo = () => {
  const [forceMaintenanceMode, setForceMaintenanceMode] = useState(true)
  const [isMaintenanceWindow, setIsMaintenanceWindow] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      
      // Check if current time is between 12:00 AM and 7:00 AM OR if forced
      const hour = now.getHours()
      setIsMaintenanceWindow((hour >= 0 && hour < 7) || forceMaintenanceMode)
    }, 1000)

    return () => clearInterval(timer)
  }, [forceMaintenanceMode])

  if (!isMaintenanceWindow) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="relative bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 border-b border-amber-500/30 backdrop-blur-sm"
    >
      {/* Demo toggle button */}
      <button
        onClick={() => setForceMaintenanceMode(!forceMaintenanceMode)}
        className="absolute top-1 right-2 text-xs text-gray-400 hover:text-white transition-colors bg-gray-800 px-2 py-1 rounded z-10"
      >
        Demo
      </button>

      <div className="relative overflow-hidden py-2">
        <motion.div
          animate={{ x: ['100%', '-100%'] }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: 'linear'
          }}
          className="whitespace-nowrap text-center"
        >
          <span className="inline-flex items-center gap-3 text-amber-200 text-sm font-medium">
            <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            🚧 Maintenance Window Active (12:00 AM - 7:00 AM)
            <span className="mx-4">•</span>
            📉 Server scaled down for cost optimization
            <span className="mx-4">•</span>
            ⚡ Some features may respond slower than usual
            <span className="mx-4">•</span>
            💡 Full service resumes at 7:00 AM
            <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          </span>
        </motion.div>
      </div>
    </motion.div>
  )
}
