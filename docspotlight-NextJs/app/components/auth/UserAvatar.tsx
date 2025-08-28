'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, LogOut, Settings } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export const UserAvatar = () => {
  const [isOpen, setIsOpen] = useState(false)
  const { user, logout } = useAuth()

  if (!user) return null

  const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || user.email[0].toUpperCase()

  return (
    <div className="relative">
      <motion.button
        className="w-10 h-10 bg-gradient-to-br from-neutral-700 to-neutral-800 rounded-full flex items-center justify-center text-sm font-medium text-neutral-100 hover:from-neutral-600 hover:to-neutral-700 transition-all duration-200 border border-neutral-600"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {initials}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown */}
            <motion.div
              className="absolute right-0 top-12 w-64 bg-neutral-900/95 backdrop-blur-xl border border-neutral-700 rounded-xl shadow-2xl z-50"
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.1 }}
            >
              {/* User Info */}
              <div className="p-4 border-b border-neutral-700/50">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-neutral-700 to-neutral-800 rounded-full flex items-center justify-center text-lg font-medium text-neutral-100">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-100 truncate">
                      {user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email}
                    </p>
                    <p className="text-xs text-neutral-400 truncate">{user.email}</p>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="p-2">
                <button className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800/50 rounded-lg transition-colors">
                  <User className="w-4 h-4" />
                  <span>Profile Settings</span>
                </button>
                
                <button className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-neutral-300 hover:text-neutral-100 hover:bg-neutral-800/50 rounded-lg transition-colors">
                  <Settings className="w-4 h-4" />
                  <span>Preferences</span>
                </button>
                
                <div className="border-t border-neutral-700/50 my-2" />
                
                <button 
                  onClick={() => {
                    logout()
                    setIsOpen(false)
                  }}
                  className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
