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
    const token = Buffer.from(part1, 'base64').toString() + Buffer.from(part2, 'base64').toString()
    return token
  } catch {
    return null
  }
}

export async function GET(request) {
  const token = getAccessToken(request)

  if (!token) {
    console.log('No token found in cookies')
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  }

  console.log('Token found, length:', token.length, 'starts with:', token.substring(0, 10))

  try {
    const listRes = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=25&q=in:inbox',
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const listData = await listRes.json()

    if (listData.error) {
      console.error('Gmail API error:', JSON.stringify(listData.error))
      return NextResponse.json({ error: listData.error.message, details: listData.error }, { status: 401 })
    }

    const messages = listData.messages || []
    const emails = await Promise.all(
      messages.slice(0, 20).map(async (msg) => {
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        const msgData = await msgRes.json()
        const headers = msgData.payload?.headers || []
        const get = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || ''
        const isUnread = msgData.labelIds?.includes('UNREAD')
        const files = (msgData.payload?.parts || []).filter(p => p.filename).map(p => p.filename).filter(Boolean)

        return {
          id: msg.id,
          from: get('From'),
          subject: get('Subject') || '(no subject)',
          preview: msgData.snippet || '',
          body: msgData.snippet || '',
          date: new Date(parseInt(msgData.internalDate)).toISOString().slice(0, 10),
          read: !isUnread,
          needsReply: false,
          waitingReply: false,
          priority: 'normal',
          project: 'Other',
          files,
          gmailId: msg.id,
        }
      })
    )

    return NextResponse.json({ emails })
  } catch (e) {
    console.error('Gmail fetch error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request) {
  const token = getAccessToken(request)
  if (!token) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })

  const { to, subject, body } = await request.json()
  const email = [`To: ${to}`, `Subject: ${subject}`, 'Content-Type: text/plain; charset=utf-8', '', body].join('\n')
  const encoded = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_')

  try {
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: encoded }),
    })
    const data = await res.json()
    return NextResponse.json({ success: true, id: data.id })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
