'use client'

import { useState, useRef, useEffect } from "react";
import { Sidebar, type HistoryItem } from './components/Sidebar'
import { Hero } from './components/Hero'
import { motion, AnimatePresence } from 'framer-motion'

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
}

interface Document {
  doc_id: string;
  filename: string;
  pages: number;
  upload_time: string;
  file_size_kb: number;
  chunks: number;
  status?: string;
}

interface Collection {
  collection_id: string;
  name: string;
  documents: Document[];
  total_documents: number;
}

export default function HomePage() {
  const [uploading, setUploading] = useState(false);
  const [docId, setDocId] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  
  // Multi-document support - chat-specific documents
  const [allDocuments, setAllDocuments] = useState<Document[]>([]); // Global documents list
  const [chatDocuments, setChatDocuments] = useState<Record<string, Document[]>>({}); // Chat-specific documents
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [showCollectionManager, setShowCollectionManager] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [allMessages, setAllMessages] = useState<Record<string, ChatMessage[]>>({})
  const [sidebarOpen, setSidebarOpen] = useState(true) // Start open by default
  const [isDesktop, setIsDesktop] = useState(true)
  const [mounted, setMounted] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Get current chat's documents
  const currentChatDocuments = activeChatId ? (chatDocuments[activeChatId] || []) : [];

  // Handle mounting to prevent hydration issues
  useEffect(() => {
    setMounted(true)
    // Set initial desktop state
    const desktop = window.innerWidth >= 768
    setIsDesktop(desktop)
    setSidebarOpen(desktop) // Open on desktop, closed on mobile initially
  }, [])

  // Check if desktop on resize only
  useEffect(() => {
    if (!mounted) return
    
    const handleResize = () => {
      const desktop = window.innerWidth >= 768
      setIsDesktop(desktop)
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [mounted])

  // Current chat messages derived from allMessages
  const messages = allMessages[activeChatId || ''] || []

  // Load persisted chats
  useEffect(() => {
    try {
      const saved = localStorage.getItem('docspotlight_chats')
      if (saved) {
        const parsed = JSON.parse(saved) as { 
          history: HistoryItem[]; 
          messages: Record<string, ChatMessage[]>; 
          activeId?: string;
          chatDocuments?: Record<string, Document[]>;
        }
        setHistory(parsed.history || [])
        setAllMessages(parsed.messages || {})
        setActiveChatId(parsed.activeId || null)
        setChatDocuments(parsed.chatDocuments || {})
      }
    } catch {}
  }, [])

  // Persist on changes
  useEffect(() => {
    const data = JSON.stringify({ 
      history, 
      messages: allMessages, 
      activeId: activeChatId,
      chatDocuments: chatDocuments
    })
    try { localStorage.setItem('docspotlight_chats', data) } catch {}
  }, [history, allMessages, activeChatId, chatDocuments])

  // Handle chat rename
  function handleRenameChat(chatId: string, newTitle: string) {
    setHistory(prev => prev.map(h => 
      h.id === chatId ? { ...h, title: newTitle } : h
    ))
  }

  // Handle chat delete
  function handleDeleteChat(chatId: string) {
    setHistory(prev => prev.filter(h => h.id !== chatId))
    setAllMessages(prev => {
      const updated = { ...prev }
      delete updated[chatId]
      return updated
    })
    // Clean up chat-specific documents
    setChatDocuments(prev => {
      const updated = { ...prev }
      delete updated[chatId]
      return updated
    })
    
    // If deleting active chat, switch to another or start new
    if (activeChatId === chatId) {
      const remaining = history.filter(h => h.id !== chatId)
      if (remaining.length > 0) {
        setActiveChatId(remaining[0].id)
      } else {
        startNewChat()
      }
    }
  }

  function startNewChat() {
    const id = crypto.randomUUID()
    setActiveChatId(id)
    setAllMessages(m => ({ ...m, [id]: [] }))
    setHistory(h => [...h, { id, title: 'New Chat', createdAt: Date.now() }])
    // Initialize empty documents for this new chat
    setChatDocuments(prev => ({ ...prev, [id]: [] }))
    // Clear any selected collection for new chat
    setSelectedCollection(null)
  }

  // Handle document removal from current chat
  const handleRemoveDocument = (docId: string) => {
    if (!activeChatId) return
    setChatDocuments(prev => ({
      ...prev,
      [activeChatId]: prev[activeChatId]?.filter(doc => doc.doc_id !== docId) || []
    }))
  }

  useEffect(() => {
    if (!activeChatId) startNewChat()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChatId])

  function pushMessage(msg: ChatMessage) {
    if (!activeChatId) return
    setAllMessages(prev => ({ ...prev, [activeChatId]: [...(prev[activeChatId]||[]), msg] }))
    // update history title if first user message
    if (msg.role === 'user') {
      setHistory(h => {
        const exists = h.find(i => i.id === activeChatId)
        if (exists) return h.map(i => i.id === activeChatId ? { ...i, title: exists.title === 'New Chat' ? msg.content.slice(0,40) : i.title } : i)
        return [...h, { id: activeChatId, title: msg.content.slice(0,40) || 'New Chat', createdAt: Date.now() }]
      })
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleUpload(file: File) {
    setUploading(true);
    setUploadedFileName(file.name); // Store the filename
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      if (!data.doc_id) throw new Error("Bad response from server");
      setDocId(data.doc_id)
      
      // Create document object
      const newDocument: Document = {
        doc_id: data.doc_id,
        filename: file.name,
        pages: data.pages || 0,
        upload_time: new Date().toISOString(),
        file_size_kb: Math.round(file.size / 1024),
        chunks: data.chunks || 0,
        status: 'ready' // Set status as ready for uploaded documents
      };
      
      // Add to global documents list
      setAllDocuments(prev => [...prev, newDocument]);
      
      // Add to current chat's documents
      if (activeChatId) {
        setChatDocuments(prev => ({
          ...prev,
          [activeChatId]: [...(prev[activeChatId] || []), newDocument]
        }));
        
        // Mark current chat as having a PDF
        setHistory(h => h.map(i => i.id === activeChatId ? { ...i, hasPdf: true } : i));
      }
      
      // Don't add any AI message here - just keep the user on Hero interface
      // The document will be visible in the Hero component
    } catch (e: any) {
      alert(e.message)
      setUploadedFileName('') // Clear filename on error
    } finally {
      setUploading(false)
    }
  }

  async function fetchDocuments() {
    try {
      const res = await fetch('/api/documents');
      if (res.ok) {
        const data = await res.json();
        setAllDocuments(data.documents || []);
      }
    } catch (e) {
      console.error('Failed to fetch documents:', e);
    }
  }

  async function createCollection() {
    if (!newCollectionName.trim() || selectedDocs.length === 0) return;
    
    setLoadingCollections(true);
    try {
      const res = await fetch('/api/collections/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCollectionName,
          doc_ids: selectedDocs
        })
      });
      
      if (res.ok) {
        const collection = await res.json();
        setCollections(prev => [...prev, collection]);
        setNewCollectionName('');
        setSelectedDocs([]);
        setShowCollectionManager(false);
        
        // Mark current chat as a collection
        if (activeChatId) {
          setHistory(h => h.map(i => i.id === activeChatId ? { 
            ...i, 
            isCollection: true, 
            documentCount: collection.documents || selectedDocs.length 
          } : i))
        }
        
        pushMessage({ 
          id: crypto.randomUUID(), 
          role: 'ai', 
          content: `🗂️ Collection **"${collection.name}"** created with ${collection.documents || selectedDocs.length} documents! You can now query across multiple documents.` 
        });
      }
    } catch (e) {
      console.error('Failed to create collection:', e);
    } finally {
      setLoadingCollections(false);
    }
  }

  // Load documents on component mount
  useEffect(() => {
    fetchDocuments();
  }, []);

  async function handleSearch(query: string) {
    if (!query.trim()) return;
    
    // Check if we have documents in current chat or a selected collection
    if (currentChatDocuments.length === 0 && !selectedCollection) {
      pushMessage({ 
        id: crypto.randomUUID(), 
        role: 'ai', 
        content: '📝 Please upload a document or select a collection first!' 
      });
      return;
    }
    
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: query }
    pushMessage(userMsg)
    
    // Check if this is the first message in the chat - if so, add a welcome message
    const isFirstMessage = messages.length === 0;
    if (isFirstMessage && currentChatDocuments.length > 0) {
      const docNames = currentChatDocuments.map(doc => doc.filename).join(', ');
      const welcomeMsg: ChatMessage = { 
        id: crypto.randomUUID(), 
        role: 'ai', 
        content: `📄 Great! I can see you've uploaded: **${docNames}**. Let me analyze your question and provide insights from ${currentChatDocuments.length > 1 ? 'these documents' : 'this document'}.`
      };
      pushMessage(welcomeMsg);
    }
    
    setLoadingAnswer(true)
    try {
      const requestBody: any = { 
        question: query,
        session_id: activeChatId || 'default'
      };
      
      if (selectedCollection) {
        requestBody.collection_id = selectedCollection;
      } else if (currentChatDocuments.length === 1) {
        // Single document
        requestBody.doc_id = currentChatDocuments[0].doc_id;
      } else if (currentChatDocuments.length > 1) {
        // Multiple documents - use multi-document chat
        requestBody.doc_ids = currentChatDocuments.map(doc => doc.doc_id);
      }
      
      const endpoint = currentChatDocuments.length > 1 && !selectedCollection ? '/api/chat/multi' : '/api/chat';
      const res = await fetch(endpoint, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(requestBody) 
      })
      if (!res.ok) throw new Error('Chat request failed')
      const data = await res.json()
      
      // Enhanced response formatting
      let responseContent = data.answer;
      
      // Add metadata for multi-document responses
      if (data.collection_info) {
        responseContent += `\n\n📊 **Query Info**: Searched ${data.collection_info.documents_searched} documents, found ${data.collection_info.sources_found} relevant sources.`;
      }
      
      // Add citation info if available
      if (data.enhanced_citations && data.enhanced_citations.length > 0) {
        responseContent += `\n\n📚 **Sources**: ${data.enhanced_citations.map((cite: any) => `Page ${cite.page}`).join(', ')}`;
      }
      
      pushMessage({ id: crypto.randomUUID(), role: 'ai', content: responseContent })
    } catch (e: any) {
      pushMessage({ id: crypto.randomUUID(), role: 'ai', content: 'Error: ' + e.message })
    } finally {
      setLoadingAnswer(false)
    }
  }

  return (
    <div className="flex h-screen w-full bg-neutral-950">
      <Sidebar
        items={history.map(h => ({ ...h, title: h.title || 'New Chat' }))}
        activeId={activeChatId}
        onSelect={id => setActiveChatId(id)}
        onNew={() => { 
          startNewChat(); 
          if (!isDesktop) setSidebarOpen(false) 
        }}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onToggle={() => {
          console.log('Toggle clicked, current state:', sidebarOpen)
          setSidebarOpen(prev => !prev)
        }}
        onRenameChat={handleRenameChat}
        onDeleteChat={handleDeleteChat}
      />
      
      <div className={`flex flex-col flex-1 h-full transition-all duration-300 ${
        isDesktop 
          ? (sidebarOpen ? 'ml-60' : 'ml-16') 
          : 'ml-0'
      }`}>
        {/* Hamburger Menu Button - show on mobile when sidebar is closed */}
        {!sidebarOpen && !isDesktop && (
          <div className="absolute top-4 left-4 z-30">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-3 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 backdrop-blur border border-neutral-700"
              aria-label="Open sidebar"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
          </div>
        )}
        
        {/* Main Content - Always show Hero or Chat based on messages */}
        {messages.length === 0 ? (
          // Hero Section when no messages
          <Hero
            onFileUpload={handleUpload}
            uploading={uploading}
            docId={docId}
            onSearch={handleSearch}
            searchDisabled={loadingAnswer}
            uploadedFileName={uploadedFileName}
            documents={currentChatDocuments}
            collections={collections}
            selectedCollection={selectedCollection}
            onCollectionSelect={setSelectedCollection}
            onShowCollectionManager={() => setShowCollectionManager(true)}
            onRemoveDocument={handleRemoveDocument}
          />
        ) : (
          // Chat Section when there are messages
          <>
            <main className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-neutral-950">
              <AnimatePresence initial={false}>
                {messages.map(m => (
                  <motion.div
                    key={m.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18 }}
                    className={`${m.role === 'user' ? 'chat-bubble-user ml-auto' : 'chat-bubble-ai'} font-body`}
                  >
                    {m.content}
                  </motion.div>
                ))}
              </AnimatePresence>
              {loadingAnswer && (
                <motion.div 
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="chat-bubble-ai opacity-70 flex items-center gap-2 font-body"
                >
                  <div className="w-4 h-4 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
                  Thinking...
                </motion.div>
              )}
              <div ref={bottomRef} />
            </main>
            
            <form 
              onSubmit={e => { 
                e.preventDefault(); 
                const formData = new FormData(e.currentTarget)
                const query = formData.get('query') as string
                if (query?.trim()) {
                  handleSearch(query.trim())
                  e.currentTarget.reset()
                }
              }} 
              className="p-4  border-neutral-800 bg-neutral-900/60 backdrop-blur"
            >
              <div className="flex gap-3">
                <input 
                  name="query"
                  placeholder={
                    selectedCollection 
                      ? 'Ask a question across your document collection...' 
                      : (docId ? 'Ask a question about the PDF...' : 'Upload a PDF to start')
                  } 
                  disabled={(!docId && !selectedCollection) || loadingAnswer} 
                  className="flex-1 rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-600 disabled:opacity-50 font-body" 
                />
                <button 
                  type="submit" 
                  disabled={(!docId && !selectedCollection) || loadingAnswer} 
                  className="px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-medium disabled:opacity-50 transition-colors font-heading"
                >
                  Send
                </button>
              </div>
            </form>
          </>
        )}
      </div>
      
      {/* Collection Manager Modal */}
      <AnimatePresence>
        {showCollectionManager && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCollectionManager(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-neutral-900 rounded-xl border border-neutral-700 p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-white">Create Document Collection</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Collection Name
                  </label>
                  <input
                    type="text"
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    placeholder="e.g., Research Papers, Legal Documents"
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Select Documents ({selectedDocs.length} selected)
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {allDocuments.map((doc: Document) => (
                      <label key={doc.doc_id} className="flex items-center gap-3 p-2 bg-neutral-800/50 rounded-lg hover:bg-neutral-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedDocs.includes(doc.doc_id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDocs(prev => [...prev, doc.doc_id]);
                            } else {
                              setSelectedDocs(prev => prev.filter(id => id !== doc.doc_id));
                            }
                          }}
                          className="w-4 h-4 text-indigo-600"
                        />
                        <div className="flex-1">
                          <div className="text-sm text-white">{doc.filename}</div>
                          <div className="text-xs text-gray-400">
                            {doc.pages} pages • {doc.chunks} chunks • {doc.file_size_kb}KB
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                
                {selectedDocs.length > 0 && (
                  <div className="p-3 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                    <p className="text-sm text-indigo-400">
                      💡 Collections allow you to query across multiple documents simultaneously. 
                      The AI will search all selected documents and provide comprehensive answers.
                    </p>
                  </div>
                )}
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCollectionManager(false)}
                    className="flex-1 px-4 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createCollection}
                    disabled={!newCollectionName.trim() || selectedDocs.length < 2 || loadingCollections}
                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
                  >
                    {loadingCollections ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Creating...
                      </div>
                    ) : (
                      'Create Collection'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}