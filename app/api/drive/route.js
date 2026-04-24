import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

async function getAccessToken() {
  const cookieStore = cookies()
  let token = cookieStore.get('access_token')?.value
  if (token) return token
  const refresh = cookieStore.get('refresh_token')?.value
  if (!refresh) return null
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refresh,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  return data.access_token || null
}

export async function GET() {
  const token = await getAccessToken()
  if (!token) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })

  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?` +
      `orderBy=modifiedTime desc&pageSize=30&fields=files(id,name,mimeType,modifiedTime,webViewLink)`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const data = await res.json()
    return NextResponse.json({ files: data.files || [] })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
