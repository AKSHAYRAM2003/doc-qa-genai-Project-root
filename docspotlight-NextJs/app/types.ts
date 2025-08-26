export interface Message {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: number
}

export interface Document {
  doc_id: string
  filename: string
  pages?: number
  file_size_kb?: number
  status?: 'ready' | 'processing' | 'error'
}

export interface Chat {
  id: string
  title: string
  messages: Message[]
}
