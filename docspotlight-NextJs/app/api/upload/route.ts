import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    
    if (!file) {
      return NextResponse.json({ error: 'No file' }, { status: 400 })
    }

    // Get authorization header from the request
    const authHeader = req.headers.get('authorization')
    
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    // Forward the request to backend with auth header
    const upstream = await fetch(`${BACKEND_URL}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
      },
      body: formData
    })
    
    const data = await upstream.json()
    return NextResponse.json(data, { status: upstream.status })
  } catch (e: unknown) {
    const error = e as Error
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
