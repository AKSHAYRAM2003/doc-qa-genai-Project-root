'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Message, Document } from '../types'
import { ShiningText } from '../../components/ui/shining-text'
import { Navbar } from './Navbar'

// Typewriter effect component
const TypewriterText = ({ 
  text, 
  delay = 30, 
  onComplete,
  messageId,
  isCompleted = false
}: { 
  text: string; 
  delay?: number; 
  onComplete?: () => void;
  messageId: string;
  isCompleted?: boolean;
}) => {
  const [displayedText, setDisplayedText] = useState(isCompleted ? text : '')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastMessageIdRef = useRef<string | null>(null)
  
  useEffect(() => {
    // If already completed from props, show full text immediately
    if (isCompleted) {
      setDisplayedText(text)
      return
    }
    
    // Check if this is a new message (different messageId) or text has changed
    const isNewMessage = lastMessageIdRef.current !== messageId
    const isTextChanged = displayedText !== text && text.length > 0
    lastMessageIdRef.current = messageId
    
    // Only animate if this is a new message, text changed, or first render
    if (!isNewMessage && !isTextChanged && displayedText === text) {
      return
    }
    
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    
    let currentIndex = 0
    setDisplayedText('')
    
    intervalRef.current = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1))
        currentIndex++
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        onComplete?.()
      }
    }, delay)
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [text, delay, messageId, isCompleted, onComplete])
  
  return <span>{displayedText}</span>
}

interface ChatProps {
  messages: Message[]
  isLoading: boolean
  searchQuery: string
  documents: Document[]
  onSendMessage: (query: string) => void
  onRegenerateMessage?: (messageId: string) => void
  onBackToHero: () => void
  isLoadingHistoricalChat?: boolean
}

export default function Chat({
  messages,
  isLoading,
  searchQuery,
  documents,
  onSendMessage,
  onRegenerateMessage,
  onBackToHero,
  isLoadingHistoricalChat = false
}: ChatProps) {
  const [inputValue, setInputValue] = useState('')
  const [showDocumentsDialog, setShowDocumentsDialog] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const [messageActions, setMessageActions] = useState<Record<string, {
    liked: boolean
    disliked: boolean
    copied: boolean
    regenerating: boolean
  }>>({})
  const [completedMessages, setCompletedMessages] = useState<Set<string>>(new Set())
  const [completedTypewriters, setCompletedTypewriters] = useState<Set<string>>(new Set())
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null)
  const [actionBarDelays, setActionBarDelays] = useState<Record<string, NodeJS.Timeout>>({})
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Initialize completed typewriters for existing messages on mount
  useEffect(() => {
    // Mark all existing AI messages as completed on initial load to prevent re-streaming on reload
    const existingAIMessages = messages
      .filter(msg => msg.type === 'ai')
      .map(msg => msg.id)
    
    if (existingAIMessages.length > 0) {
      setCompletedTypewriters(new Set(existingAIMessages))
    }
  }, []) // Only run on mount

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Reset completed messages when messages change (e.g., regenerate)
  useEffect(() => {
    // Only keep completed messages that still exist in the current messages array
    const currentMessageIds = new Set(messages.map(msg => msg.id))
    
    setCompletedMessages(prev => {
      const filtered = new Set<string>()
      prev.forEach(id => {
        if (currentMessageIds.has(id)) {
          filtered.add(id)
        }
      })
      
      // If loading historical chat, mark all AI messages as complete immediately
      if (isLoadingHistoricalChat) {
        messages.forEach(msg => {
          if (msg.type === 'ai') {
            filtered.add(msg.id)
          }
        })
      }
      
      return filtered
    })
    
    setCompletedTypewriters(prev => {
      const filtered = new Set<string>()
      prev.forEach(id => {
        if (currentMessageIds.has(id)) {
          filtered.add(id)
        }
      })
      
      // If loading historical chat, mark all AI messages as having completed typewriter
      if (isLoadingHistoricalChat) {
        messages.forEach(msg => {
          if (msg.type === 'ai') {
            filtered.add(msg.id)
          }
        })
      }
      
      return filtered
    })
    
    // Clear any pending action bar delays for removed messages
    setActionBarDelays(prev => {
      const updated = { ...prev }
      Object.keys(updated).forEach(messageId => {
        if (!currentMessageIds.has(messageId)) {
          clearTimeout(updated[messageId])
          delete updated[messageId]
        }
      })
      return updated
    })
    
    // Clean up completed typewriters for removed messages
    setCompletedTypewriters(prev => {
      const filtered = new Set<string>()
      prev.forEach(id => {
        if (currentMessageIds.has(id)) {
          filtered.add(id)
        }
      })
      return filtered
    })
  }, [messages, isLoadingHistoricalChat])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(actionBarDelays).forEach(timeout => clearTimeout(timeout))
    }
  }, [actionBarDelays])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [inputValue])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoadingHistoricalChat) return

    const query = inputValue.trim()
    setInputValue('')
    await onSendMessage(query)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  const handleOpenPDF = (doc: Document) => {
    // Create a URL to view the PDF - assuming the backend serves PDFs at /pdf/{doc_id}
    const pdfUrl = `http://127.0.0.1:8000/pdf/${doc.doc_id}`
    window.open(pdfUrl, '_blank')
  }

  // Action bar functions
  const handleCopy = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setMessageActions(prev => ({
        ...prev,
        [messageId]: { ...prev[messageId], copied: true }
      }))
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setMessageActions(prev => ({
          ...prev,
          [messageId]: { ...prev[messageId], copied: false }
        }))
      }, 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const handleLike = (messageId: string) => {
    setMessageActions(prev => ({
      ...prev,
      [messageId]: { 
        ...prev[messageId], 
        liked: !prev[messageId]?.liked,
        disliked: false // Clear dislike if liking
      }
    }))
  }

  const handleDislike = (messageId: string) => {
    setMessageActions(prev => ({
      ...prev,
      [messageId]: { 
        ...prev[messageId], 
        disliked: !prev[messageId]?.disliked,
        liked: false // Clear like if disliking
      }
    }))
  }

  const handleRegenerate = async (messageId: string) => {
    // Prevent multiple regenerations
    if (messageActions[messageId]?.regenerating) return
    
    // Clear the completed typewriter for this message so it can animate again
    setCompletedTypewriters(prev => {
      const updated = new Set(prev)
      updated.delete(messageId)
      return updated
    })
    
    // Clear completed status for action bar
    setCompletedMessages(prev => {
      const updated = new Set(prev)
      updated.delete(messageId)
      return updated
    })
    
    setMessageActions(prev => ({
      ...prev,
      [messageId]: { ...prev[messageId], regenerating: true }
    }))
    
    try {
      if (onRegenerateMessage) {
        // Use the proper regenerate handler from parent
        await onRegenerateMessage(messageId)
      } else {
        // Fallback to the old method if no regenerate handler provided
        const messageIndex = messages.findIndex(msg => msg.id === messageId)
        if (messageIndex > 0) {
          const userMessage = messages[messageIndex - 1]
          if (userMessage.type === 'user') {
            await onSendMessage(userMessage.content)
          }
        }
      }
    } finally {
      setMessageActions(prev => ({
        ...prev,
        [messageId]: { ...prev[messageId], regenerating: false }
      }))
    }
  }

  const handleTypewriterComplete = useCallback((messageId: string) => {
    // Prevent action bar from showing during historical chat loading
    if (isLoadingHistoricalChat) return
    
    // Prevent duplicate calls for the same message
    if (completedMessages.has(messageId)) {
      return
    }
    
    // Clear any existing delay for this message
    if (actionBarDelays[messageId]) {
      clearTimeout(actionBarDelays[messageId])
    }
    
    // Set a delay before showing the action bar to ensure streaming is fully complete
    const timeout = setTimeout(() => {
      setCompletedMessages(prev => {
        if (prev.has(messageId)) {
          return prev // Already completed
        }
        return new Set(prev).add(messageId)
      })
      setActionBarDelays(prev => {
        const updated = { ...prev }
        delete updated[messageId]
        return updated
      })
    }, 1500) // 1.5 second delay after typewriter completes
    
    setActionBarDelays(prev => ({
      ...prev,
      [messageId]: timeout
    }))
  }, [completedMessages, actionBarDelays, isLoadingHistoricalChat])

  return (
    <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        {/* Header with Navbar */}
        <div className="backdrop-blur">
          <Navbar variant="chat" />
          
          {/* Additional chat-specific header content */}
          <div className="px-4 py-3 border-t border-neutral-800/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Chat title or breadcrumb could go here */}
              </div>
              
              {documents.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowDocumentsDialog(true)}
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                    className="p-2 hover:bg-neutral-800 rounded-full transition-colors text-neutral-400 hover:text-white"
                  >
                    {/* Gallery Vertical Icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                      <path d="M3 2h18"/>
                      <rect width="18" height="12" x="3" y="6" rx="2"/>
                      <path d="M3 22h18"/>
                    </svg>
                  </button>
                  
                  {/* Custom Tooltip */}
                  {showTooltip && (
                     <div className="absolute top-full right-0  px-2 py-2 bg-white text-black text-sm rounded-full shadow-lg border border-neutral-700 whitespace-nowrap z-50 ">
                      View files in this chat
                      <div className="absolute bottom-full right-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-neutral-900"></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto py-7">
          <div className="max-w-4xl mx-auto px-4 space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.type === 'ai' && (
                  <div className="flex flex-col items-start mr-17">
                    {/* DocSpotlight Logo above AI responses */}
                    <div className="mb-3 flex items-center gap-2">
                      <img 
                        src="/logo-white.svg" 
                        alt="DocSpotlight" 
                        className="w-4 h-5 ml-2" 
                      />
                      <span className="text-sm text-neutral-400 font-medium">DocSpotlight</span>
                    </div>
                    <div className="max-w-2xl rounded-full p-2 shadow-lg">
                      <div className="whitespace-pre-wrap text-md font-bold leading-relaxed">
                        {isLoadingHistoricalChat || completedTypewriters.has(message.id) ? (
                          // Show content immediately when loading historical chat or already completed
                          <span>{message.content}</span>
                        ) : (
                          // Use typewriter effect for new messages only
                          <TypewriterText 
                            key={`${message.id}-${message.content.length}-${completedTypewriters.has(message.id) ? 'completed' : 'new'}`}
                            text={message.content} 
                            delay={25} 
                            messageId={message.id}
                            isCompleted={false}
                            onComplete={() => {
                              setCompletedTypewriters(prev => new Set(prev).add(message.id))
                              handleTypewriterComplete(message.id)
                            }}
                          />
                        )}
                      </div>
                    </div>
                    
                    {/* ChatGPT-style Action Bar - Only show after streaming is complete */}
                    {completedMessages.has(message.id) && (
                      <div className="flex items-center gap-1 mt-1 ml-2">
                        {/* Copy Button */}
                        <div className="relative">
                          <button
                            onClick={() => handleCopy(message.id, message.content)}
                            onMouseEnter={() => setActiveTooltip(`copy-${message.id}`)}
                            onMouseLeave={() => setActiveTooltip(null)}
                            className="p-2 rounded-lg hover:bg-neutral-800 transition-colors group"
                          >
                            <svg className="w-4 h-4 text-neutral-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                          
                          {/* Copy Tooltip */}
                          {activeTooltip === `copy-${message.id}` && !messageActions[message.id]?.copied && (
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-neutral-700 text-white text-xs rounded-full whitespace-nowrap font-bold ">
                              Copy
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-b-2 border-transparent border-b-neutral-700 "></div>
                            </div>
                          )}
                          
                          {/* Copy Feedback */}
                          {messageActions[message.id]?.copied && (
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-green-600 text-white text-xs rounded-full whitespace-nowrap font-bold">
                              Copied!
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-b-2 border-transparent border-b-green-600"></div>
                            </div>
                          )}
                        </div>

                        {/* Like Button */}
                        <div className="relative">
                          <button
                            onClick={() => handleLike(message.id)}
                            onMouseEnter={() => setActiveTooltip(`like-${message.id}`)}
                            onMouseLeave={() => setActiveTooltip(null)}
                            className={`p-2 rounded-lg hover:bg-neutral-800 transition-colors group ${
                              messageActions[message.id]?.liked ? 'bg-neutral-800' : ''
                            }`}
                          >
                            <svg className={`w-4 h-4 transition-colors ${
                              messageActions[message.id]?.liked 
                                ? 'text-green-400' 
                                : 'text-neutral-400 group-hover:text-white'
                            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                            </svg>
                          </button>
                          
                          {/* Like Tooltip */}
                          {activeTooltip === `like-${message.id}` && (
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-neutral-700 text-white text-xs rounded-full whitespace-nowrap font-bold">
                              {messageActions[message.id]?.liked ? 'Remove like' : 'Good response'}
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-b-2 border-transparent border-b-neutral-700 font-bold"></div>
                            </div>
                          )}
                        </div>

                        {/* Dislike Button */}
                        <div className="relative">
                          <button
                            onClick={() => handleDislike(message.id)}
                            onMouseEnter={() => setActiveTooltip(`dislike-${message.id}`)}
                            onMouseLeave={() => setActiveTooltip(null)}
                            className={`p-2 rounded-lg hover:bg-neutral-800 transition-colors group ${
                              messageActions[message.id]?.disliked ? 'bg-neutral-800' : ''
                            }`}
                          >
                            <svg className={`w-4 h-4 transition-colors ${
                              messageActions[message.id]?.disliked 
                                ? 'text-red-400' 
                                : 'text-neutral-400 group-hover:text-white'
                            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2M17 4h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                            </svg>
                          </button>
                          
                          {/* Dislike Tooltip */}
                          {activeTooltip === `dislike-${message.id}` && (
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-neutral-700 text-white text-xs rounded-full whitespace-nowrap font-bold">
                              {messageActions[message.id]?.disliked ? 'Remove dislike' : 'Poor response'}
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-b-2 border-transparent border-b-neutral-700 font-bold"></div>
                            </div>
                          )}
                        </div>

                        {/* Regenerate Button */}
                        <div className="relative">
                          <button
                            onClick={() => handleRegenerate(message.id)}
                            onMouseEnter={() => setActiveTooltip(`regenerate-${message.id}`)}
                            onMouseLeave={() => setActiveTooltip(null)}
                            disabled={messageActions[message.id]?.regenerating}
                            className="p-2 rounded-lg hover:bg-neutral-800 transition-colors group disabled:opacity-50"
                          >
                            {messageActions[message.id]?.regenerating ? (
                              <svg className="w-4 h-4 text-neutral-400 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 text-neutral-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            )}
                          </button>
                          
                          {/* Regenerate Tooltip */}
                          {activeTooltip === `regenerate-${message.id}` && !messageActions[message.id]?.regenerating && (
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-neutral-700 text-white text-xs rounded-full whitespace-nowrap font-bold">
                              Regenerate response
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-b-2 border-transparent border-b-neutral-700 rounded-full"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {message.type === 'user' && (
                  <div className="max-w-2xl rounded-full p-2 bg-neutral-800 text-white ml-15 shadow-lg">
                    <div className="whitespace-pre-wrap text-md font-bold leading-relaxed">
                      {message.content}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="flex flex-col items-start mr-18">
                  {/* DocSpotlight Logo above loading message */}
                  <div className="mb-3 flex items-center gap-2">
                    <img 
                      src="/logo-white.svg" 
                      alt="DocSpotlight" 
                      className="w-6 h-6" 
                    />
                    <span className="text-sm text-neutral-400 font-medium">DocSpotlight</span>
                  </div>
                  <div className="shadow-lg">
                    <div className="flex items-center space-x-2">
                      <ShiningText text=" Thinking..." />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div ref={bottomRef} />
        </div>

        {/* Input Form */}
        <div className="">
          <div className="max-w-4xl mx-auto p-4">
            <form onSubmit={handleSubmit} className="relative">
              <div className="relative flex items-end bg-neutral-800 rounded-2xl border border-neutral-700 focus-within:border-blue-500/50 transition-colors">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question about your documents..."
                  className="flex-1 bg-transparent text-white placeholder-neutral-400 border-none resize-none focus:outline-none px-4 py-3 min-h-[50px] max-h-32"
                  rows={1}
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isLoading}
                  className="flex-shrink-0 p-3 m-1 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-700 disabled:cursor-not-allowed transition-colors"
                >
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </div>

      {/* Documents Dialog */}
      <AnimatePresence>
        {showDocumentsDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDocumentsDialog(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-neutral-900 rounded-xl border border-neutral-700 p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Dialog Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">
                  Added files ({documents.length})
                </h2>
                <button
                  onClick={() => setShowDocumentsDialog(false)}
                  className="p-2 hover:bg-neutral-800 rounded-full transition-colors text-neutral-400 hover:text-white"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Documents Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {documents.map((doc) => (
                  <motion.div
                    key={doc.doc_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group bg-neutral-800/50 border border-neutral-700 rounded-lg p-4 hover:border-neutral-600 transition-all cursor-pointer"
                    onClick={() => handleOpenPDF(doc)}
                  >
                    <div className="flex items-start gap-3">
                      {/* PDF Icon */}
                      {/* <div className="flex-shrink-0 w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div> */}
                            <div className="flex-shrink-0 w-6 h-5 bg-red-800 rounded  flex items-center justify-center">
                                  <span className="text-white text-[8px] font-extrabold p-5 leading-none tracking-wide">PDF</span>
                                </div>

                      {/* Document Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-medium truncate group-hover:text-blue-400 transition-colors">
                          {doc.filename}
                        </h3>
                        <div className="text-sm text-neutral-400 mt-1">
                          {doc.pages && (
                            <span>{doc.pages} pages</span>
                          )}
                          {doc.file_size_kb && (
                            <span className="ml-2">
                              {doc.file_size_kb > 1024 
                                ? `${Math.round(doc.file_size_kb / 1024 * 10) / 10} MB`
                                : `${doc.file_size_kb} KB`
                              }
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-neutral-500 mt-1">
                          Click to open in browser
                        </div>
                      </div>

                      {/* Open Icon */}
                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* No Documents Message */}
              {documents.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-neutral-400">No documents uploaded yet</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
