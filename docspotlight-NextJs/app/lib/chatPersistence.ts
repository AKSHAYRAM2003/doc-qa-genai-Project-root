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
 * Get user-specific localStorage key for anonymous users
 */
function getAnonymousUserKey(): string {
  // Create a simple anonymous session ID that persists for the browser session
  let sessionId = sessionStorage.getItem('anonymous_session_id')
  if (!sessionId) {
    sessionId = 'anon_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    sessionStorage.setItem('anonymous_session_id', sessionId)
  }
  return `docspotlight_chats_${sessionId}`
}

/**
 * Get user-specific localStorage key
 */
function getUserSpecificKey(userId?: string): string {
  if (userId) {
    return `docspotlight_chats_user_${userId}`
  }
  return getAnonymousUserKey()
}

/**
 * Clear all chat-related localStorage data (for security)
 */
function clearAllChatLocalStorage(): void {
  const keysToRemove: string[] = []
  
  // Find all chat-related keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && (key.startsWith('docspotlight_chats') || key === 'docspotlight_chats')) {
      keysToRemove.push(key)
    }
  }
  
  // Remove all found keys
  keysToRemove.forEach(key => {
    localStorage.removeItem(key)
    console.log(`[ChatPersistence] Cleared localStorage key: ${key}`)
  })
  
  // Also clear session storage
  sessionStorage.removeItem('anonymous_session_id')
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
  isAuthenticated: boolean,
  userId?: string
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

  console.log('[ChatPersistence] saveChats called, isAuthenticated:', isAuthenticated, 'userId:', userId)

  if (isAuthenticated) {
    try {
      console.log('[ChatPersistence] Saving to backend for authenticated user...')
      await saveChatsToBackend(cleanedChatData)
      console.log('[ChatPersistence] Successfully saved to backend')
      
      // For authenticated users, we ONLY save to backend
      // No localStorage backup to prevent cross-user data leakage
      
      // Clear any existing localStorage chat data to prevent conflicts
      clearAllChatLocalStorage()
      console.log('[ChatPersistence] Cleared localStorage to prevent data leakage')
    } catch (error) {
      console.error('[ChatPersistence] Failed to save to backend:', error)
      throw error // Don't fall back to localStorage for authenticated users
    }
  } else {
    // Anonymous users: use session-specific localStorage
    const storageKey = getUserSpecificKey(userId)
    console.log('[ChatPersistence] Saving to localStorage for anonymous user with key:', storageKey)
    localStorage.setItem(storageKey, JSON.stringify(cleanedChatData))
  }
}

/**
 * Smart chat loading: load from backend for authenticated users, localStorage for anonymous
 */
export async function loadChats(isAuthenticated: boolean, userId?: string): Promise<ChatData | null> {
  console.log('[ChatPersistence] loadChats called, isAuthenticated:', isAuthenticated, 'userId:', userId)
  
  if (isAuthenticated) {
    try {
      console.log('[ChatPersistence] Loading from backend for authenticated user...')
      const backendData = await loadChatsFromBackend()
      if (backendData) {
        console.log('[ChatPersistence] Successfully loaded from backend')
        
        // Clear any existing localStorage data to prevent conflicts
        clearAllChatLocalStorage()
        
        return backendData
      } else {
        console.log('[ChatPersistence] No data from backend')
        return null
      }
    } catch (error) {
      console.error('[ChatPersistence] Failed to load from backend:', error)
      return null
    }
  } else {
    // Anonymous users: load from session-specific localStorage
    try {
      const storageKey = getUserSpecificKey(userId)
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        console.log('[ChatPersistence] Loading from localStorage for anonymous user with key:', storageKey)
        const data = JSON.parse(saved) as ChatData
        console.log('[ChatPersistence] Anonymous localStorage data:', data)
        return data
      } else {
        console.log('[ChatPersistence] No data in localStorage for anonymous user')
      }
    } catch (error) {
      console.error('[ChatPersistence] Failed to load from localStorage:', error)
    }
  }

  console.log('[ChatPersistence] No chat data found')
  return null
}

/**
 * Migrate localStorage chats to backend on first login
 */
export async function migrateLocalChatsToBackend(): Promise<void> {
  try {
    // Check for old localStorage format first
    const oldLocalData = localStorage.getItem('docspotlight_chats')
    
    // Also check for any user-specific keys
    const userKeys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('docspotlight_chats_')) {
        userKeys.push(key)
      }
    }
    
    let dataToMigrate: ChatData | null = null
    
    if (oldLocalData) {
      dataToMigrate = JSON.parse(oldLocalData) as ChatData
      console.log('[ChatPersistence] Found old format data to migrate')
    } else if (userKeys.length > 0) {
      // Try to migrate from the most recent user-specific data
      const mostRecentKey = userKeys[userKeys.length - 1]
      const keyData = localStorage.getItem(mostRecentKey)
      if (keyData) {
        dataToMigrate = JSON.parse(keyData) as ChatData
        console.log('[ChatPersistence] Found user-specific data to migrate from key:', mostRecentKey)
      }
    }
    
    if (!dataToMigrate || !dataToMigrate.history || dataToMigrate.history.length === 0) {
      console.log('[ChatPersistence] No data to migrate')
      return
    }

    await saveChatsToBackend(dataToMigrate)
    console.log('[ChatPersistence] Successfully migrated local chats to backend')
    
    // Clear all localStorage chat data after successful migration
    clearAllChatLocalStorage()
    console.log('[ChatPersistence] Cleared localStorage after migration')
    
  } catch (error) {
    console.error('[ChatPersistence] Failed to migrate local chats to backend:', error)
    // Don't throw - migration failure shouldn't block login
  }
}

/**
 * Clear chats on logout to prevent data leakage
 */
export function clearChatsOnLogout(): void {
  console.log('[ChatPersistence] Clearing all chat data on logout for security')
  
  // Clear all chat-related localStorage
  clearAllChatLocalStorage()
  
  // Remove authentication tokens
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
  
  console.log('[ChatPersistence] All user data cleared on logout')
}

/**
 * @deprecated Use clearChatsOnLogout instead
 * Clear only authentication tokens, preserve chat data for logged-in users
 */
export function logoutPreservingChats(): void {
  console.warn('[ChatPersistence] logoutPreservingChats is deprecated, use clearChatsOnLogout for security')
  clearChatsOnLogout()
}
