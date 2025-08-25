'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'

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
  onShowCollectionManager
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState<string>(propUploadedFileName || '')
  const [isSearchFocused, setIsSearchFocused] = useState(false)

  // Update filename when prop changes
  useEffect(() => {
    if (propUploadedFileName) {
      setUploadedFileName(propUploadedFileName)
    }
  }, [propUploadedFileName])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const query = formData.get('query') as string
    if (query.trim() && docId) {
      onSearch(query.trim())
      e.currentTarget.reset()
    }
  }

  const handleFileSelect = (file: File) => {
    if (file.type === 'application/pdf') {
      setUploadedFileName(file.name)
      onFileUpload(file)
      setShowUploadModal(false)
    }
  }

  const handlePlusClick = () => {
    setShowUploadModal(true)
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

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-8 sm:py-12 bg-gradient-to-b from-neutral-950 via-neutral-900/50 to-neutral-950">
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
            className="text-3xl sm:text-4xl md:text-6xl font-bold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent font-editorial"
            style={{ 
              lineHeight: '1.4', 
              paddingTop: '0.3em', 
              paddingBottom: '0.3em'
            }}
          >
            Chat with your{' '}
            <span className="bg-gradient-to-b from-green-500 via-yellow-500 to-blue-500 text-transparent bg-clip-text italic">
              Documents
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-body tracking-tight px-4 sm:px-0"
          >
            Upload any PDF and start an intelligent conversation. Get instant answers, 
            summaries, and insights from your documents with AI-powered search.
          </motion.p>
        </div>

        {/* ChatGPT-like Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="space-y-4 sm:space-y-6 flex flex-col items-center px-4 sm:px-0"
        >
          <form onSubmit={handleSubmit} className="w-full max-w-2xl flex justify-center">
            <motion.div 
              className={`relative bg-neutral-800/50 border border-neutral-700 rounded-full backdrop-blur-sm transition-all duration-300 w-full ${
                isSearchFocused 
                  ? 'border-indigo-500 shadow-lg shadow-indigo-500/20' 
                  : 'hover:border-neutral-600'
              }`}
              initial={{ width: '100%' }}
              animate={{ 
                scale: isSearchFocused ? 1.02 : 1
              }}
              transition={{ 
                duration: 0.3, 
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
            >
              {/* Plus icon for PDF upload */}
              <button
                type="button"
                onClick={handlePlusClick}
                disabled={uploading}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
                title="Upload PDF"
              >
                <svg width="20" height="20" className="sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 8v8"/>
                  <path d="M8 12h8"/>
                </svg>
              </button>

              {/* PDF indicator when file is uploaded */}
              {docId && uploadedFileName && (
                <div className="absolute left-10 sm:left-16 top-1/2 -translate-y-1/2 flex items-center gap-1 sm:gap-2 bg-red-500/20 border border-red-500/30 rounded-full px-2 sm:px-3 py-1">
                  <svg width="14" height="14" className="sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10,9 9,9 8,9"/>
                  </svg>
                  <span className="text-xs text-red-400 font-medium truncate max-w-16 sm:max-w-32">
                    {uploadedFileName}
                  </span>
                </div>
              )}

              {/* Input field */}
                <input
                name="query"
                type="text"
                placeholder={docId ? "Message DocSpotlight..." : "Upload a PDF to start chatting..."}
                disabled={uploading}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className={`w-full ${docId && uploadedFileName ? 'pl-32 sm:pl-48' : 'pl-12 sm:pl-16'} pr-12 sm:pr-16 py-3 sm:py-5 text-base sm:text-lg font-bold bg-transparent focus:outline-none placeholder-neutral-400 placeholder:text-xs sm:placeholder:text-sm text-white font-body transition-all duration-300 tracking-tight`}
                />

              {/* Send button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={!docId || uploading}
                className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-white hover:bg-gray-100 rounded-full disabled:opacity-50 disabled:bg-neutral-300 transition-all duration-200 flex items-center justify-center"
              >
                <svg width="16" height="16" className="sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L11 13"/>
                  <path d="M22 2l-7 20-4-9-9-4 20-7z"/>
                </svg>
              </motion.button>
            </motion.div>
          </form>

          {/* Upload status */}
          {uploading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="flex items-center justify-center gap-3 text-sm text-gray-400">
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                Uploading PDF...
              </div>
            </motion.div>
          )}

          {/* Quick Actions - only show when document is uploaded */}
          {docId && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="flex flex-wrap gap-2 sm:gap-3 justify-center px-4 sm:px-0"
            >
              {[
                "Summarize this document",
                "What are the key points?",
                "Find important dates",
                "Extract main conclusions"
              ].map((suggestion, index) => (
                <motion.button
                  key={index}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSearch(suggestion)}
                  disabled={uploading}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-neutral-800/60 hover:bg-neutral-700/60 text-gray-300 hover:text-white rounded-lg border border-neutral-700 hover:border-neutral-600 transition-all duration-200 disabled:opacity-50 font-body"
                >
                  {suggestion}
                </motion.button>
              ))}
            </motion.div>
          )}

          {/* Multi-Document Collection Management */}
          {documents.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="w-full max-w-2xl bg-neutral-800/30 rounded-lg border border-neutral-700 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-300">🗂️ Document Collections</h3>
                <button
                  onClick={onShowCollectionManager}
                  className="text-xs px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-colors"
                >
                  Create Collection
                </button>
              </div>
              
              {/* Collection Selection */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="single-doc"
                    name="source"
                    checked={!selectedCollection}
                    onChange={() => onCollectionSelect?.(null)}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <label htmlFor="single-doc" className="text-sm text-gray-300">
                    Single Document ({uploadedFileName || 'Latest uploaded'})
                  </label>
                </div>
                
                {collections.map((collection: any) => (
                  <div key={collection.collection_id} className="flex items-center gap-2">
                    <input
                      type="radio"
                      id={collection.collection_id}
                      name="source"
                      checked={selectedCollection === collection.collection_id}
                      onChange={() => onCollectionSelect?.(collection.collection_id)}
                      className="w-4 h-4 text-indigo-600"
                    />
                    <label htmlFor={collection.collection_id} className="text-sm text-gray-300">
                      📚 {collection.name} ({collection.documents || collection.total_documents} docs)
                    </label>
                  </div>
                ))}
              </div>
              
              {selectedCollection && (
                <p className="text-xs text-indigo-400">
                  Multi-document mode: Your questions will search across all documents in the collection.
                </p>
              )}
            </motion.div>
          )}

          {/* Simple helper text */}
          <p className="text-xs sm:text-sm text-gray-500 text-center font-body px-4 sm:px-0">
            {docId ? "Ask questions about your uploaded document" : "Upload a PDF to start an intelligent conversation"}
          </p>
        </motion.div>
      </motion.div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowUploadModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-neutral-900 rounded-xl border border-neutral-700 p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center space-y-6">
                <h3 className="text-xl font-semibold text-white font-heading">Upload PDF Document</h3>
                
                {/* Drag and Drop Area */}
                <div
                  className={`border-2 border-dashed rounded-lg p-8 transition-all duration-200 ${
                    dragActive 
                      ? 'border-indigo-500 bg-indigo-500/10' 
                      : 'border-neutral-600 hover:border-neutral-500 hover:bg-neutral-800/30'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <div className="flex flex-col items-center space-y-4">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14,2 14,8 20,8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10,9 9,9 8,9"/>
                    </svg>
                    
                    <div className="text-center">
                      <p className="text-white font-medium font-body">
                        {dragActive ? 'Drop your PDF here' : 'Drag and drop your PDF'}
                      </p>
                      <p className="text-sm text-neutral-400 mt-1 font-body">or click to browse</p>
                    </div>
                    
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-6 py-2 bg-neutral-600 hover:bg-neutral-500 text-white rounded-full font-medium transition-colors font-heading "
                    >
                      Choose File
                    </button>
                  </div>
                </div>
                
                <p className="text-xs text-neutral-500 font-body">
                  Supports PDF files up to 10MB
                </p>
                
                {/* Close button */}
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="w-full px-4 py-2 text-neutral-400 hover:text-white transition-colors font-body"
                >
                  Cancel
                </button>
              </div>
              
              {/* Hidden file input */}
              <input 
                ref={fileInputRef} 
                type="file" 
                accept="application/pdf" 
                className="hidden" 
                onChange={e => { 
                  const f = e.target.files?.[0]; 
                  if (f) handleFileSelect(f) 
                }} 
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
