/**
 * Chat Persistence Utilities
 * Handles saving and loading chat data for authenticated users via backend API
 */

import { Document } from '../types'

// Define interfaces used in the main page.tsx
export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp?: number;
}

export interface HistoryItem {
  id: string
  title: string
  createdAt: number
  hasPdf?: boolean
  isCollection?: boolean
  documentCount?: number
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

export interface ChatData {
  history: HistoryItem[]
  messages: Record<string, ChatMessage[]>
  activeId?: string | null
  chatDocuments?: Record<string, any[]>  // Use any[] to match Document type from different modules
}

/**
 * Save user's chat data to the backend
 */
export async function saveChatsToBackend(chatData: ChatData): Promise<void> {
  const token = localStorage.getItem('access_token')
  if (!token) {
    throw new Error('No authentication token found')
  }

  const response = await fetch('/api/user/save-chats', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ chats: chatData }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Failed to save chats')
  }
}

/**
 * Load user's chat data from the backend
 */
export async function loadChatsFromBackend(): Promise<ChatData | null> {
  const token = localStorage.getItem('access_token')
  if (!token) {
    console.log('[ChatPersistence] No access token found')
    return null
  }

  try {
    console.log('[ChatPersistence] Loading chats from backend...')
    const response = await fetch('/api/user/load-chats', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      console.error('[ChatPersistence] Failed to load chats from backend, status:', response.status)
      return null
    }

    const data = await response.json()
    console.log('[ChatPersistence] Successfully loaded chats from backend:', data)
    return data.chats
  } catch (error) {
    console.error('[ChatPersistence] Error loading chats from backend:', error)
    return null
  }
}

/**
 * Smart chat persistence: save to backend for authenticated users, localStorage for anonymous
 */
export async function saveChats(
  chatData: ChatData,
  isAuthenticated: boolean
): Promise<void> {
  // Clean up the chat data to prevent errors
  const cleanedChatData = {
    ...chatData,
    activeId: chatData.activeId || undefined,
    // Filter out any invalid document references
    chatDocuments: Object.fromEntries(
      Object.entries(chatData.chatDocuments || {}).map(([chatId, docs]) => [
        chatId,
        (docs || []).filter(doc => doc && doc.doc_id && doc.doc_id.trim() !== '')
      ])
    )
  }

  console.log('[ChatPersistence] saveChats called, isAuthenticated:', isAuthenticated, 'data:', cleanedChatData)

  if (isAuthenticated) {
    try {
      console.log('[ChatPersistence] Saving to backend...')
      await saveChatsToBackend(cleanedChatData)
      console.log('[ChatPersistence] Successfully saved to backend')
      // Also save to localStorage as backup
      localStorage.setItem('docspotlight_chats', JSON.stringify(cleanedChatData))
      console.log('[ChatPersistence] Also saved to localStorage as backup')
    } catch (error) {
      console.error('[ChatPersistence] Failed to save to backend, saving to localStorage only:', error)
      localStorage.setItem('docspotlight_chats', JSON.stringify(cleanedChatData))
    }
  } else {
    // Anonymous users: only use localStorage
    console.log('[ChatPersistence] Saving to localStorage (anonymous user)')
    localStorage.setItem('docspotlight_chats', JSON.stringify(cleanedChatData))
  }
}

/**
 * Smart chat loading: load from backend for authenticated users, localStorage for anonymous
 */
export async function loadChats(isAuthenticated: boolean): Promise<ChatData | null> {
  console.log('[ChatPersistence] loadChats called, isAuthenticated:', isAuthenticated)
  
  if (isAuthenticated) {
    try {
      console.log('[ChatPersistence] Attempting to load from backend...')
      // Try to load from backend first
      const backendData = await loadChatsFromBackend()
      if (backendData) {
        console.log('[ChatPersistence] Successfully loaded from backend')
        return backendData
      } else {
        console.log('[ChatPersistence] No data from backend, trying localStorage...')
      }
    } catch (error) {
      console.error('[ChatPersistence] Failed to load from backend, falling back to localStorage:', error)
    }
  }

  // Fallback to localStorage (for anonymous users or when backend fails)
  try {
    const saved = localStorage.getItem('docspotlight_chats')
    if (saved) {
      console.log('[ChatPersistence] Loading from localStorage')
      const data = JSON.parse(saved) as ChatData
      console.log('[ChatPersistence] localStorage data:', data)
      return data
    } else {
      console.log('[ChatPersistence] No data in localStorage')
    }
  } catch (error) {
    console.error('[ChatPersistence] Failed to load from localStorage:', error)
  }

  console.log('[ChatPersistence] No chat data found anywhere')
  return null
}

/**
 * Migrate localStorage chats to backend on first login
 */
export async function migrateLocalChatsToBackend(): Promise<void> {
  try {
    const localData = localStorage.getItem('docspotlight_chats')
    if (!localData) {
      return // No local data to migrate
    }

    const chatData = JSON.parse(localData) as ChatData
    if (!chatData.history || chatData.history.length === 0) {
      return // No chats to migrate
    }

    await saveChatsToBackend(chatData)
    console.log('Successfully migrated local chats to backend')
  } catch (error) {
    console.error('Failed to migrate local chats to backend:', error)
    // Don't throw - migration failure shouldn't block login
  }
}

/**
 * Clear authentication tokens and chat data on logout
 */
export function clearUserDataOnLogout(): void {
  // Remove auth-related items
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
  
  // Remove chat data to prevent showing previous user's chats to next user
  localStorage.removeItem('docspotlight_chats')
  
  console.log('[ChatPersistence] Cleared all user data on logout')
}
