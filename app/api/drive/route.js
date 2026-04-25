import { NextResponse } from 'next/server'

function getAccessToken(request) {
  const auth = request.headers.get('Authorization')
  if (auth?.startsWith('Bearer ')) return auth.replace('Bearer ', '').trim()
  return null
}

export async function GET(request) {
  const token = getAccessToken(request)
  if (!token) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })

  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?orderBy=modifiedTime desc&pageSize=30&fields=files(id,name,mimeType,modifiedTime,webViewLink)`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const data = await res.json()
    return NextResponse.json({ files: data.files || [] })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
