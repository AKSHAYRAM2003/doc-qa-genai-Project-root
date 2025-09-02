import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

export async function POST(
  req: NextRequest,
  { params }: { params: { chatId: string } }
) {
  try {
    const authHeader = req.headers.get('authorization')
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    }

    // Wait for params to be available
    const { chatId } = await params

    const response = await fetch(`${BACKEND_URL}/api/user/restore-chat-documents/${chatId}`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
      },
    })

    const data = await response.json()
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Restore chat documents API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
