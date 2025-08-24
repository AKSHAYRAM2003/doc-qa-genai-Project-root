'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

export interface HistoryItem {
  id: string
  title: string
  createdAt: number
}

interface SidebarProps {
  items: HistoryItem[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  open: boolean
  onClose: () => void
  onToggle: () => void
}

const variants = {
  open: { 
    x: 0, 
    opacity: 1, 
    transition: { type: 'spring' as const, stiffness: 170, damping: 20 } 
  },
  closed: { 
    x: -260, 
    opacity: 0, 
    transition: { duration: 0.3 } 
  }
}

const IconButton = ({ icon, label, onClick, active = false, collapsed = false }: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  active?: boolean
  collapsed?: boolean
}) => (
  <motion.button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
      active 
        ? 'bg-neutral-800 text-white' 
        : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
    } ${collapsed ? 'justify-center' : ''}`}
    whileHover={{ scale: collapsed ? 1.05 : 1.02 }}
    whileTap={{ scale: 0.98 }}
  >
    <div className="flex-shrink-0 w-5 h-5">
      {icon}
    </div>
    {!collapsed && <span className="text-sm font-medium">{label}</span>}
  </motion.button>
)

// Random chat data for demo
const demoChats = [
  { id: 'demo1', title: 'Marketing Strategy Analysis', createdAt: Date.now() - 3600000 },
  { id: 'demo2', title: 'Financial Report Q3 2024', createdAt: Date.now() - 7200000 },
  { id: 'demo3', title: 'Product Launch Guidelines', createdAt: Date.now() - 10800000 },
  { id: 'demo4', title: 'Technical Documentation', createdAt: Date.now() - 14400000 },
  { id: 'demo5', title: 'User Research Findings', createdAt: Date.now() - 18000000 },
]

export const Sidebar: React.FC<SidebarProps> = ({ items, activeId, onSelect, onNew, open, onClose, onToggle }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const collapsed = !open
  
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 425)
    }
    
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])
  
  const filteredItems = [...items, ...demoChats].filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <>
      {/* Mobile dark backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black md:hidden z-40" 
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Collapsed Sidebar Icons - Only show on desktop */}
      <AnimatePresence>
        {collapsed && (
          <motion.div
            initial={{ x: -80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -80, opacity: 0 }}
            className="hidden md:flex fixed left-0 top-0 h-full w-16 bg-neutral-900/80 backdrop-blur border-r border-neutral-800 z-40 flex-col py-4"
          >
            <div className="flex flex-col gap-2 px-2">
              <IconButton
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <line x1="3" y1="12" x2="21" y2="12"/>
                    <line x1="3" y1="18" x2="21" y2="18"/>
                  </svg>
                }
                label="Menu"
                onClick={onToggle}
                collapsed={true}
              />
              
              <IconButton
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9"/>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                  </svg>
                }
                label="New Chat"
                onClick={onNew}
                collapsed={true}
              />
              
              <IconButton
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="M21 21l-4.35-4.35"/>
                  </svg>
                }
                label="Search"
                onClick={onToggle}
                collapsed={true}
              />
            </div>

            {/* Profile at bottom */}
            <div className="mt-auto px-2">
              <motion.button
                onClick={onToggle}
                className="w-full p-2 rounded-lg hover:bg-neutral-800/60 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                  U
                </div>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Sidebar */}
      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ x: -260 }}
            animate={{ x: 0 }}
            exit={{ x: -260 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-60 shrink-0 h-full bg-neutral-900/80 backdrop-blur border-r border-neutral-800 flex flex-col fixed left-0 top-0 z-50"
          >
        <div className="p-4 flex items-center justify-between border-b border-neutral-800">
          {/* Logo on the left */}
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="DocSpotlight" className="w-6 h-6 filter invert brightness-0 contrast-100" style={{filter: 'invert(1) brightness(2)'}} />
            <span className="text-md font-bold tracking-wide text-white/90 font-heading">DocSpotlight</span>
          </div>
          
          {/* Hamburger Menu on the right - always show, becomes X on mobile when open */}
          <button 
            onClick={onToggle} 
            className="p-2 rounded-lg hover:bg-neutral-200 text-neutral-300" 
            aria-label="Toggle sidebar"
          >
            {isMobile && open ? (
              // X icon for mobile when open
              <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18"/>
                <path d="M6 6l12 12"/>
              </svg>
            ) : (
              // Hamburger icon for all other cases
              <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            )}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="p-4 space-y-2">
          <IconButton
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"/>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
            }
            label="New Chat"
            onClick={() => { onNew(); if (typeof window !== 'undefined' && window.innerWidth < 768) onClose(); }}
          />

          {/* Search */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400  ">
              <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-neutral-800 border border-neutral-700 rounded-full focus:outline-none focus:ring-1 focus:ring-neutral-500 placeholder-neutral-400 "
            />
          </div>
        </div>

        {/* Chats Section */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="px-4 pb-2">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider font-heading">Chats</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-1 px-2">
            {filteredItems.length === 0 && (
              <div className="text-xs text-neutral-500 px-2 py-4 text-center">No chats found</div>
            )}
            {filteredItems.map(item => (
              <motion.button
                key={item.id}
                onClick={() => { onSelect(item.id); if (typeof window !== 'undefined' && window.innerWidth < 768) onClose(); }}
                className={`group w-full text-left rounded-lg px-3 py-2.5 flex flex-col gap-1 border border-transparent hover:border-neutral-700 hover:bg-neutral-800/60 transition-all duration-200 ${item.id === activeId ? 'bg-neutral-800/80 border-neutral-700' : ''}`}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <span className="text-sm font-medium truncate text-white/90 font-heading">{item.title}</span>
                <span className="text-xs text-neutral-500">{new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Profile Section */}
        <div className="p-4 border-t border-neutral-800">
          <motion.button
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-800/60 transition-all duration-200"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
              U
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium text-white/90 font-heading">User</div>
              <div className="text-xs text-neutral-400">Manage account</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </motion.button>
        </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}
