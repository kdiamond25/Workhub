import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  const { message, emails, tasks, projects, meetings } = await request.json()

  const context = `You are WorkHub — Kim Diamond's email and project management assistant at True Citrus.

Current state:
Emails: ${JSON.stringify(emails?.map(e => ({ id: e.id, from: e.from, subject: e.subject, project: e.project, priority: e.priority, needsReply: e.needsReply, waitingReply: e.waitingReply, read: e.read, body: e.body?.slice(0, 200) })))}
Tasks: ${JSON.stringify(tasks)}
Projects: ${projects?.join(', ')}
Meetings: ${JSON.stringify(meetings)}

You can help Kim:
- Move emails to different project categories
- Change email priority (high/normal/low)
- Mark emails as needing reply or waiting on response
- Add tasks to the task list
- Draft email replies
- Triage and classify all unread emails
- Answer questions about project status

When making changes return a JSON block wrapped in <actions></actions> tags at the END of your reply:
<actions>
{
  "emailUpdates": [{"id": "...", "project": "...", "priority": "...", "needsReply": true/false, "waitingReply": true/false}],
  "newTasks": [{"text": "...", "project": "...", "due": ""}],
  "draftReply": {"to": "...", "subject": "...", "body": "..."}
}
</actions>

Only include keys that have changes. If no changes needed, omit the <actions> block entirely.
Be concise and direct. Use plain text, no markdown.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: `${context}\n\nKim says: "${message}"` }],
    })

    const fullText = response.content.map(b => b.text || '').join('')
    const actionsMatch = fullText.match(/<actions>([\s\S]*?)<\/actions>/)
    const displayText = fullText.replace(/<actions>[\s\S]*?<\/actions>/g, '').trim()
    let actions = null

    if (actionsMatch) {
      try { actions = JSON.parse(actionsMatch[1].trim()) } catch {}
    }

    return NextResponse.json({ reply: displayText, actions })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
