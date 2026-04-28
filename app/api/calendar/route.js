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

  const now = new Date()
  const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now.toISOString()}&timeMax=${twoWeeks.toISOString()}&singleEvents=true&orderBy=startTime&maxResults=20`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const data = await res.json()
    const events = (data.items || []).map(e => ({
      id: e.id,
      title: e.summary || 'Meeting',
      date: (e.start?.dateTime || e.start?.date || '').slice(0, 10),
      time: e.start?.dateTime ? new Date(e.start.dateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '',
      description: e.description || '',
      project: 'Other',
    }))
    return NextResponse.json({ events })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
