import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8010'

export async function POST(req: NextRequest) {
  try {
    const { question, pdf_id, doc_id } = await req.json()
    const did = doc_id || pdf_id
    if (!question) return NextResponse.json({ error: 'Missing question' }, { status: 400 })
    if (!did) return NextResponse.json({ error: 'Missing doc id' }, { status: 400 })
    const upstream = await fetch(`${BACKEND_URL}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, doc_id: did }) })
    const data = await upstream.json()
    return NextResponse.json(data, { status: upstream.status })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
