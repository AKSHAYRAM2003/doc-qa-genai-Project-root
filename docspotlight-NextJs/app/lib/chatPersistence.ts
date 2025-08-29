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
    return null
  }

  try {
    const response = await fetch('/api/user/load-chats', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      console.error('Failed to load chats from backend')
      return null
    }

    const data = await response.json()
    return data.chats
  } catch (error) {
    console.error('Error loading chats from backend:', error)
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
  // Convert null to undefined for activeId
  const processedChatData = {
    ...chatData,
    activeId: chatData.activeId || undefined
  }

  if (isAuthenticated) {
    try {
      await saveChatsToBackend(processedChatData)
      // Also save to localStorage as backup
      localStorage.setItem('docspotlight_chats', JSON.stringify(processedChatData))
    } catch (error) {
      console.error('Failed to save to backend, saving to localStorage only:', error)
      localStorage.setItem('docspotlight_chats', JSON.stringify(processedChatData))
    }
  } else {
    // Anonymous users: only use localStorage
    localStorage.setItem('docspotlight_chats', JSON.stringify(processedChatData))
  }
}

/**
 * Smart chat loading: load from backend for authenticated users, localStorage for anonymous
 */
export async function loadChats(isAuthenticated: boolean): Promise<ChatData | null> {
  if (isAuthenticated) {
    try {
      // Try to load from backend first
      const backendData = await loadChatsFromBackend()
      if (backendData) {
        return backendData
      }
    } catch (error) {
      console.error('Failed to load from backend, falling back to localStorage:', error)
    }
  }

  // Fallback to localStorage (for anonymous users or when backend fails)
  try {
    const saved = localStorage.getItem('docspotlight_chats')
    if (saved) {
      return JSON.parse(saved) as ChatData
    }
  } catch (error) {
    console.error('Failed to load from localStorage:', error)
  }

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
 * Clear only authentication tokens, preserve chat data for logged-in users
 */
export function logoutPreservingChats(): void {
  // Only remove auth-related items, preserve chat data
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
  
  // Keep 'docspotlight_chats' in localStorage as backup
  // The authenticated user's chats are now also saved in the backend
}
