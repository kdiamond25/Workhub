import { NextResponse } from 'next/server'

function getAccessToken(request) {
  const cookie = request.headers.get('cookie') || ''
  const getCookie = (name) => {
    const match = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))
    return match ? match[1] : null
  }
  const part1 = getCookie('wh_t1')
  const part2 = getCookie('wh_t2')
  const exp = getCookie('wh_exp')
  if (!part1 || !part2) return null
  if (exp && parseInt(exp) < Date.now()) return null
  try {
    return Buffer.from(part1, 'base64').toString() + Buffer.from(part2, 'base64').toString()
  } catch { return null }
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
