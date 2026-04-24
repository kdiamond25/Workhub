import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  const { emails, projects } = await request.json()
  const unprocessed = emails.filter(e => !e.read && !e.manualOverride)

  if (!unprocessed.length) {
    return NextResponse.json({ results: [], message: 'No unread emails to triage.' })
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Triage these emails for Kim Diamond at True Citrus.
Available projects: ${projects.join(', ')}, Other.

For each email return ONLY a JSON array:
[{
  "id": "...",
  "project": "...",
  "priority": "high|normal|low",
  "needsReply": true/false,
  "waitingReply": true/false,
  "hasTask": true/false,
  "taskText": "..." or null,
  "confidence": "high|low",
  "reason": "one sentence explaining classification"
}]

If classification is uncertain set confidence to "low".

Emails:
${unprocessed.map(e => `ID: ${e.id}\nFrom: ${e.from}\nSubject: ${e.subject}\nBody: ${e.body || e.preview}`).join('\n---\n')}

Return ONLY the JSON array, no other text.`
      }],
    })

    const text = response.content.map(b => b.text || '').join('')
    const results = JSON.parse(text.replace(/```json|```/g, '').trim())
    return NextResponse.json({ results })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
