'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import { Navbar } from './Navbar'
import { ServerStatusBanner, ServerStatusMarquee } from './ServerStatusMarquee'

interface HeroProps {
  onFileUpload: (file: File) => void
  uploading: boolean
  docId: string | null
  onSearch: (query: string) => void
  searchDisabled: boolean
  uploadedFileName?: string
  // Multi-document props
  documents?: any[]
  collections?: any[]
  selectedCollection?: string | null
  onCollectionSelect?: (collectionId: string | null) => void
  onShowCollectionManager?: () => void
  onRemoveDocument?: (docId: string) => void
}

export const Hero: React.FC<HeroProps> = ({ 
  onFileUpload, 
  uploading, 
  docId, 
  onSearch, 
  searchDisabled,
  uploadedFileName: propUploadedFileName,
  documents = [],
  collections = [],
  selectedCollection,
  onCollectionSelect,
  onShowCollectionManager,
  onRemoveDocument
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [query, setQuery] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [isComposing, setIsComposing] = useState(false)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [query])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim() && !searchDisabled && !isComposing) {
      onSearch(query.trim())
      setQuery('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleFileSelect = (file: File) => {
    if (file.type === 'application/pdf') {
      onFileUpload(file)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      handleFileSelect(file)
    }
  }

  const handleRemoveDocument = (docId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onRemoveDocument) {
      onRemoveDocument(docId)
    }
  }

  const availableDocuments = documents.filter((doc: any) => doc.doc_id)

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900/50 to-neutral-950">
      {/* Navbar */}
      <Navbar variant="hero" />
      
      {/* Server Status Banner */}
      <ServerStatusBanner />
      {/* Main Hero Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl w-full text-center space-y-6 sm:space-y-8"
        >
        {/* Main Heading */}
        <div className="space-y-4 sm:space-y-6 py-4 sm:py-8">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-7xl font-bold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent font-editorial"
            style={{ 
              lineHeight: '1.2', 
              paddingTop: '0.2em', 
              paddingBottom: '0.2em'
            }}
          >
            AI-Powered Document{' '}
            <span className="bg-gradient-to-b from-green-500 via-yellow-500 to-blue-500 text-transparent bg-clip-text  italic">
              <span className='font-normal'>I</span>ntelligence
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl md:text-md text-gray-300 max-w-3xl mx-auto leading-relaxed font-body tracking-tighter px-4 sm:px-0 font-FK Grotesk Neue font-normal"
          >
            Transform your <span className='font-editorial font-[10px] bg-gradient-to-r from-yellow-500 via-red-500 to-pink-500 text-transparent bg-clip-text'>PDFs</span> into intelligent conversations. Upload, query, and get 
            instant insights across multiple documents with advanced AI search.
          </motion.p>
        </div>

        {/* Input Area */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }} 
          className="relative transition-all duration-300"
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <form onSubmit={handleSubmit}>
            <div className={`relative bg-neutral-800/60 backdrop-blur border border-neutral-700 rounded-3xl transition-all duration-200 ${
              dragActive ? 'border-blue-500 bg-blue-500/10' : 'hover:border-neutral-600 focus-within:border-neutral-500'
            }`}>
              
              {/* Document Cards - Show inside the input area when documents are uploaded */}
              <AnimatePresence>
                {availableDocuments.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 border-b border-neutral-700/50"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl mx-auto">
                      {availableDocuments.map((doc: any, index: number) => (
                        <motion.div
                          key={doc.doc_id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ delay: index * 0.1 }}
                          className={`group relative border rounded-lg p-3 transition-colors ${
                            doc.status === 'processing' 
                              ? 'bg-yellow-900/20 border-yellow-600/50' 
                              : doc.status === 'error'
                              ? 'bg-red-900/20 border-red-600/50'
                              : 'bg-neutral-700/30 border-neutral-600/50 hover:border-neutral-500'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                              {doc.status === 'processing' ? (
                                <div className="w-6 h-6 bg-yellow-600 rounded flex items-center justify-center">
                                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                                </div>
                              ) : doc.status === 'error' ? (
                                <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center">
                                  <span className="text-white text-xs font-bold">!</span>
                                </div>
                              ) : (
                                <div className="w-6 h-5 bg-red-800 rounded  flex items-center justify-center">
                                  <span className="text-white text-[8px] font-extrabold p-5 leading-none tracking-wide">PDF</span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-white font-medium text-sm truncate">
                                {doc.filename}
                              </h3>
                              <p className="text-neutral-400 text-xs mt-1">
                                {doc.status === 'processing' 
                                  ? 'Processing...' 
                                  : doc.status === 'error'
                                  ? 'Processing failed'
                                  : `${doc.pages} pages • ${Math.round(doc.file_size_kb / 1024 * 10) / 10} MB`
                                }
                              </p>
                            </div>
                            {/* Remove Button - Show on hover for all documents except processing */}
                            {doc.status !== 'processing' && (
                              <button
                                type="button"
                                onClick={(e) => handleRemoveDocument(doc.doc_id, e)}
                                className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center transition-all duration-200 flex-shrink-0 hover:scale-110"
                                title="Remove document"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white">
                                  <line x1="18" y1="6" x2="6" y2="18"/>
                                  <line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                              </button>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Main Input Row */}
              <div className="flex items-end gap-3 p-4">
                
                {/* Plus Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-shrink-0 w-10 h-10 bg-neutral-700 hover:bg-neutral-600 rounded-full flex items-center justify-center transition-colors"
                  disabled={uploading}
                >
                  {uploading ? (
                    <div className="w-5 h-5 border-2 border-neutral-400 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-300">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  )}
                </button>

                {/* Text Input */}
                <div className="flex-1">
                  <textarea
                    ref={textareaRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onCompositionStart={() => setIsComposing(true)}
                    onCompositionEnd={() => setIsComposing(false)}
                    placeholder={availableDocuments.length > 1 ? "Ask questions across all your documents..." : availableDocuments.length === 1 ? "Ask about your document..." : "Ask DocSpotlight"}
                    className="w-full bg-transparent border-none outline-none resize-none text-white placeholder-neutral-400 text-base leading-6 min-h-[24px] max-h-40 overflow-y-auto"
                    rows={1}
                    disabled={searchDisabled}
                  />
                </div>

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!query.trim() || searchDisabled || uploading || isComposing}
                  className="flex-shrink-0 w-10 h-10 bg-white hover:bg-neutral-100 disabled:bg-neutral-600 disabled:cursor-not-allowed rounded-full flex items-center justify-center transition-all duration-200 transform hover:scale-105 disabled:scale-100"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={query.trim() && !searchDisabled ? "text-neutral-900" : "text-neutral-400"}>
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22,2 15,22 11,13 2,9 22,2"/>
                  </svg>
                </button>
              </div>

              {/* Drag Overlay */}
              {dragActive && (
                <div className="absolute inset-0 bg-blue-500/20 border-2 border-blue-500 border-dashed rounded-3xl flex items-center justify-center z-10">
                  <div className="text-blue-400 text-center">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto mb-2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14,2 14,8 20,8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10,9 9,9 8,9"/>
                    </svg>
                    <p className="text-sm font-medium">Drop PDF here</p>
                  </div>
                </div>
              )}
            </div>
          </form>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileSelect(file)
            }}
            className="hidden"
          />
        </motion.div>

        {/* Upload Status */}
        <AnimatePresence>
          {uploading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center"
            >
              <div className="inline-flex items-center gap-2 text-neutral-400 text-sm">
                <div className="w-4 h-4 border-2 border-neutral-400 border-t-blue-400 rounded-full animate-spin" />
                Uploading PDF...
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collections Section */}
        {collections.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 space-y-4"
          >
            <h3 className="text-neutral-400 text-sm font-medium">Collections</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {collections.map((collection: any) => (
                <button
                  key={collection.collection_id}
                  onClick={() => onCollectionSelect?.(collection.collection_id)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    selectedCollection === collection.collection_id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-neutral-700 bg-neutral-800/50 hover:border-neutral-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-white">
                        <path d="M7 4V2C7 1.45 7.45 1 8 1H16C16.55 1 17 1.45 17 2V4H20C20.55 4 21 4.45 21 5C21 5.55 20.55 6 20 6H19V19C19 20.1 18.1 21 17 21H7C5.9 21 5 20.1 5 19V6H4C3.45 6 3 5.55 3 5C3 4.45 3.45 4 4 4H7Z"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-medium text-sm">{collection.name}</h4>
                      <p className="text-neutral-400 text-xs">{collection.total_documents} documents</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        </motion.div>
      </div>
    </div>
  )
}