'use client'

import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Message, Document } from '../types'

interface ChatProps {
  messages: Message[]
  isLoading: boolean
  searchQuery: string
  documents: Document[]
  onSendMessage: (query: string) => void
  onBackToHero: () => void
}

export default function Chat({
  messages,
  isLoading,
  searchQuery,
  documents,
  onSendMessage,
  onBackToHero
}: ChatProps) {
  const [inputValue, setInputValue] = useState('')
  const [showDocumentsDialog, setShowDocumentsDialog] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [inputValue])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return

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

  return (
    <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        {/* Header */}
        <div className=" backdrop-blur px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* <button
                onClick={onBackToHero}
                className="p-2 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400 hover:text-white"
                title="Back to upload"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-lg font-semibold text-white">Chat</h1> */}
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
                   <div className="absolute top-full right-0  px-2 py-2 bg-neutral-900 text-white text-[10px] rounded-full shadow-lg border border-neutral-700 whitespace-nowrap z-50 ">
                    View files in this chat
                    <div className="absolute bottom-full right-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-neutral-900"></div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl rounded-2xl px-4 py-3 ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-neutral-800 text-neutral-100'
                }`}
              >
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.content}
                </div>
                <div className="text-xs opacity-70 mt-2">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-3xl rounded-2xl px-4 py-3 bg-neutral-800 text-neutral-100">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  <span className="text-sm">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Form */}
        <div className="border-t border-neutral-800 bg-neutral-900/60 backdrop-blur">
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
