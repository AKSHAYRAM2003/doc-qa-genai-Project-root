'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { PanelLeftClose, PanelLeftOpen, CircleUserRound, User, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext'
import { ProfileModal } from './auth/ProfileModal'

export interface HistoryItem {
  id: string
  title: string
  createdAt: number
  hasPdf?: boolean
  isCollection?: boolean
  documentCount?: number
}

interface SidebarProps {
  items: HistoryItem[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  open: boolean
  onClose: () => void
  onToggle: () => void
  onRenameChat?: (id: string, newTitle: string) => void
  onDeleteChat?: (id: string) => void
  chatDocuments?: Record<string, Array<{
    doc_id: string
    filename: string
    pages: number
    file_size_kb: number
    status?: string
  }>>
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

// Removed demo placeholder chats – sidebar now reflects real chat history only
const demoChats: HistoryItem[] = []

export const Sidebar: React.FC<SidebarProps> = ({ 
  items, 
  activeId, 
  onSelect, 
  onNew, 
  open, 
  onClose, 
  onToggle, 
  onRenameChat, 
  onDeleteChat,
  chatDocuments
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const collapsed = !open
  const { user, isAuthenticated } = useAuth()
  
  // Helper function to check if a chat has documents
  const hasDocuments = (chatId: string): boolean => {
    return (chatDocuments && chatDocuments[chatId]?.length > 0) || false
  }
  
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 425)
    }
    
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])
  
  const filteredItems = [...items, ...demoChats].filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase()))

  const handleRename = (id: string, currentTitle: string) => {
    setEditingId(id)
    setEditingTitle(currentTitle)
    setActiveMenu(null)
  }
  
  const handleRenameSubmit = (id: string) => {
    if (onRenameChat && editingTitle.trim()) {
      onRenameChat(id, editingTitle.trim())
    }
    setEditingId(null)
    setEditingTitle('')
  }
  
  const handleDelete = (id: string) => {
    if (onDeleteChat) {
      onDeleteChat(id)
    }
    setActiveMenu(null)
  }
  
  const handleMenuClick = (e: React.MouseEvent, itemId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setActiveMenu(activeMenu === itemId ? null : itemId)
  }

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
            <div className="flex flex-col gap-2 px-2 ">
              <IconButton
                icon={
                  <PanelLeftOpen />
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

            {/* Profile at bottom - Only show if authenticated */}
            <div className="mt-auto px-2">
              {isAuthenticated && user && (
                <motion.button
                  onClick={() => setShowProfileModal(true)}
                  className="w-full p-2 rounded-lg hover:bg-neutral-800/60 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="w-8 h-8 border-1 bg-gradient-to-br from-neutral-700 to-neutral-800 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                    {user.first_name ? user.first_name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                  </div>
                </motion.button>
              )}
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
            className="p-2 rounded-full hover:bg-neutral-700 text-neutral-300" 
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
              // <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              //   <line x1="3" y1="6" x2="21" y2="6"/>
              //   <line x1="3" y1="12" x2="21" y2="12"/>
              //   <line x1="3" y1="18" x2="21" y2="18"/>
              // </svg>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-panel-right-open-icon lucide-panel-right-open"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M15 3v18"/><path d="m10 15-3-3 3-3"/></svg>
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
              <motion.div
                key={item.id}
                className={`group relative w-full rounded-lg transition-all duration-200 ${
                  item.id === activeId 
                    ? 'bg-neutral-800/80' 
                    : 'hover:bg-neutral-800/60'
                } ${activeMenu === item.id ? 'bg-neutral-800/80' : ''}`}
                whileHover={activeMenu === item.id ? {} : { scale: 1.005 }}
                whileTap={activeMenu === item.id ? {} : { scale: 0.995 }}
              >
                {/* Main Chat Row */}
                <div 
                  className="flex items-center gap-3 px-3 py-2.5 relative"
                >
                  {/* PDF Icon - Always show for chats with documents */}
                  <motion.div 
                    className="flex-shrink-0 w-4 h-4 flex items-center justify-center"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {item.isCollection ? (
                      <div className="relative">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-blue-400">
                          <path d="M7 4V2C7 1.45 7.45 1 8 1H16C16.55 1 17 1.45 17 2V4H20C20.55 4 21 4.45 21 5C21 5.55 20.55 6 20 6H19V19C19 20.1 18.1 21 17 21H7C5.9 21 5 20.1 5 19V6H4C3.45 6 3 5.55 3 5C3 4.45 3.45 4 4 4H7ZM9 8V18H15V8H9Z"/>
                        </svg>
                        {item.documentCount && item.documentCount > 1 && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-[8px] font-bold">{item.documentCount}</span>
                          </div>
                        )}
                      </div>
                    ) : hasDocuments(item.id) ? (
                      <div className="w-6 h-4 bg-red-700 rounded flex items-center justify-center p-2">
                        <span className="text-white text-[8px] font-extrabold leading-none tracking-wide">PDF</span>
                      </div>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-400">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14,2 14,8 20,8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                        <polyline points="10,9 9,9 8,9"/>
                      </svg>
                    )}
                  </motion.div>

                  {/* Chat Title - Clickable area */}
                  <div 
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={(e) => {
                      if (activeMenu === item.id || editingId === item.id) {
                        e.preventDefault()
                        e.stopPropagation()
                        return
                      }
                      onSelect(item.id); 
                      if (typeof window !== 'undefined' && window.innerWidth < 768) onClose(); 
                    }}
                  >
                    {editingId === item.id ? (
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleRenameSubmit(item.id)
                          } else if (e.key === 'Escape') {
                            setEditingId(null)
                            setEditingTitle('')
                          }
                        }}
                        onBlur={() => handleRenameSubmit(item.id)}
                        className="w-full text-sm font-medium bg-neutral-700 border border-neutral-600 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 text-white"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <div className="flex items-center">
                        <span className="text-sm font-medium truncate text-white/90 pr-2">
                          {item.title}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Three Dots Menu - ChatGPT style */}
                  <motion.div className="flex-shrink-0 relative">
                    <motion.button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleMenuClick(e, item.id)
                      }}
                      className={`w-7 h-7 rounded-md flex items-center justify-center transition-all duration-200 ${
                        activeMenu === item.id
                          ? 'bg-neutral-700 opacity-100' 
                          : 'opacity-0 group-hover:opacity-100 hover:bg-neutral-700'
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-neutral-400">
                        <circle cx="5" cy="12" r="2"/>
                        <circle cx="12" cy="12" r="2"/>
                        <circle cx="19" cy="12" r="2"/>
                      </svg>
                    </motion.button>

                    {/* Dropdown Menu */}
                    <AnimatePresence>
                      {activeMenu === item.id && (
                        <>
                          {/* Backdrop to close menu */}
                          <div
                            className="fixed inset-0 z-[100] bg-transparent"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setActiveMenu(null)
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault()
                              setActiveMenu(null)
                            }}
                          />
                          
                          {/* Menu */}
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -8 }}
                            transition={{ duration: 0.1 }}
                            className="absolute right-0 top-8 w-40 bg-neutral-800 border border-neutral-600 rounded-lg shadow-xl z-[101] overflow-hidden"
                          >
                            <div className="py-1">
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleRename(item.id, item.title)
                                }}
                                className="w-full px-4 py-2.5 text-left text-sm text-neutral-200 hover:text-white hover:bg-neutral-700 transition-colors flex items-center gap-3"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
                                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                                </svg>
                                Rename
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleDelete(item.id)
                                }}
                                className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:text-red-300 hover:bg-neutral-700 transition-colors flex items-center gap-3"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
                                  <polyline points="3,6 5,6 21,6"/>
                                  <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
                                </svg>
                                Delete
                              </button>
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </div>
              </motion.div>
            ))}            
          </div>
        </div>

        {/* Profile Section - Only show if user is authenticated */}
        {isAuthenticated && user && (
          <div className="p-4 border-t border-neutral-800">
            <motion.button
              onClick={() => setShowProfileModal(true)}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-800/60 transition-all duration-200"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-8 h-8 border-1 bg-gradient-to-br from-neutral-700 to-neutral-800 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                {user.first_name ? user.first_name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-white/90 font-heading">
                  {user.first_name && user.last_name 
                    ? `${user.first_name} ${user.last_name}`
                    : user.email.split('@')[0]
                  }
                </div>
                <div className="text-xs text-neutral-400">Manage account</div>
              </div>
              <Settings className="w-4 h-4 text-neutral-400" />
            </motion.button>
          </div>
        )}
      </motion.aside>
    )}
  </AnimatePresence>
  
  {/* Profile Modal */}
  <ProfileModal 
    isOpen={showProfileModal} 
    onClose={() => setShowProfileModal(false)} 
  />
  </>
  )
}