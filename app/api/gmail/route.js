import { NextResponse } from 'next/server'

async function getAccessToken(request) {
  // Get token from Authorization header (sent by frontend)
  const auth = request.headers.get('Authorization')
  if (auth?.startsWith('Bearer ')) {
    return auth.replace('Bearer ', '').trim()
  }
  return null
}

export async function GET(request) {
  const token = await getAccessToken(request)
  if (!token) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })

  try {
    const listRes = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=25&q=in:inbox',
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const listData = await listRes.json()

    if (listData.error) {
      console.error('Gmail API error:', JSON.stringify(listData.error))
      return NextResponse.json({ error: listData.error.message, code: listData.error.code, status_str: listData.error.status }, { status: 401 })
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
        const files = (msgData.payload?.parts || [])
          .filter(p => p.filename)
          .map(p => p.filename)
          .filter(Boolean)

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
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request) {
  const token = await getAccessToken(request)
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
