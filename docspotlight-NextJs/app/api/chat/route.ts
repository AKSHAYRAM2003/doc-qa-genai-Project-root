import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

export async function POST(req: NextRequest) {
  try {
    const { question, pdf_id, doc_id, collection_id, session_id = 'default', enable_cache = true } = await req.json()
    const did = doc_id || pdf_id
    
    if (!question) return NextResponse.json({ error: 'Missing question' }, { status: 400 })
    if (!did && !collection_id) return NextResponse.json({ error: 'Missing doc_id or collection_id' }, { status: 400 })
    
    // Get authorization header from the request
    const authHeader = req.headers.get('authorization')
    
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }
    
    const requestBody: Record<string, unknown> = { 
      question, 
      session_id,
      enable_cache
    }
    
    if (collection_id) {
      requestBody.collection_id = collection_id
    } else {
      requestBody.doc_id = did
    }

    const upstream = await fetch(`${BACKEND_URL}/chat`, { 
      method: 'POST', 
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': authHeader
      }, 
      body: JSON.stringify(requestBody) 
    })
    const data = await upstream.json()
    return NextResponse.json(data, { status: upstream.status })
  } catch (e: unknown) {
    const error = e as Error
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
