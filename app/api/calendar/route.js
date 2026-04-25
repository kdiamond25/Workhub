import { NextResponse } from 'next/server'

function getAccessToken(request) {
  const auth = request.headers.get('Authorization')
  if (auth?.startsWith('Bearer ')) return auth.replace('Bearer ', '').trim()
  return null
}

export async function GET(request) {
  const token = getAccessToken(request)
  if (!token) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })

  const now = new Date()
  const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${now.toISOString()}&timeMax=${twoWeeks.toISOString()}&singleEvents=true&orderBy=startTime&maxResults=20`,
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

export async function POST(request) {
  const token = getAccessToken(request)
  if (!token) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })

  const { title, date, time, description } = await request.json()
  const startDateTime = new Date(`${date}T${time || '09:00'}:00`)
  const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000)

  try {
    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary: title, description,
        start: { dateTime: startDateTime.toISOString() },
        end: { dateTime: endDateTime.toISOString() },
      }),
    })
    const data = await res.json()
    return NextResponse.json({ success: true, event: data })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
