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

export default function HomePage() {
  const [uploading, setUploading] = useState(false);
  const [docId, setDocId] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [allMessages, setAllMessages] = useState<Record<string, ChatMessage[]>>({})
  const [sidebarOpen, setSidebarOpen] = useState(true) // Start open by default
  const [isDesktop, setIsDesktop] = useState(true)
  const [mounted, setMounted] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null);

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

  function startNewChat() {
    const id = crypto.randomUUID()
    setActiveChatId(id)
    setAllMessages(m => ({ ...m, [id]: [] }))
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
      pushMessage({ id: crypto.randomUUID(), role: 'ai', content: `PDF uploaded successfully! ${data.chunks} chunks processed. Ask me anything about your document.` })
    } catch (e: any) {
      alert(e.message)
      setUploadedFileName('') // Clear filename on error
    } finally {
      setUploading(false)
    }
  }

  async function handleSearch(query: string) {
    if (!query.trim() || !docId) return
    
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: query }
    pushMessage(userMsg)
    setLoadingAnswer(true)
    try {
      const res = await fetch('/api/chat', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ question: query, pdf_id: docId }) 
      })
      if (!res.ok) throw new Error('Chat request failed')
      const data = await res.json()
      pushMessage({ id: crypto.randomUUID(), role: 'ai', content: data.answer })
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
              className="p-4 border-t border-neutral-800 bg-neutral-900/60 backdrop-blur"
            >
              <div className="flex gap-3">
                <input 
                  name="query"
                  placeholder={docId ? 'Ask a question about the PDF...' : 'Upload a PDF to start'} 
                  disabled={!docId || loadingAnswer} 
                  className="flex-1 rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-600 disabled:opacity-50 font-body" 
                />
                <button 
                  type="submit" 
                  disabled={!docId || loadingAnswer} 
                  className="px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-medium disabled:opacity-50 transition-colors font-heading"
                >
                  Send
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
