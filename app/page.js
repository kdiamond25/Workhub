'use client'
import { useState, useEffect, useRef } from 'react'

const PROJECTS = ['Syndigo','Samples','Coupons','Presentations','Jotform','Chatbot','IRI','HH Panel']

const PC = {
  Syndigo:       { a:'#534AB7', bg:'#EEEDFE', t:'#26215C', b:'#AFA9EC' },
  Samples:       { a:'#0F6E56', bg:'#E1F5EE', t:'#04342C', b:'#5DCAA5' },
  Coupons:       { a:'#993C1D', bg:'#FAECE7', t:'#4A1B0C', b:'#F0997B' },
  Presentations: { a:'#185FA5', bg:'#E6F1FB', t:'#042C53', b:'#85B7EB' },
  Jotform:       { a:'#854F0B', bg:'#FAEEDA', t:'#412402', b:'#EF9F27' },
  Chatbot:       { a:'#993556', bg:'#FBEAF0', t:'#4B1528', b:'#ED93B1' },
  IRI:           { a:'#3B6D11', bg:'#EAF3DE', t:'#173404', b:'#97C459' },
  'HH Panel':    { a:'#185FA5', bg:'#E6F1FB', t:'#042C53', b:'#85B7EB' },
  Other:         { a:'#5F5E5A', bg:'#F1EFE8', t:'#2C2C2A', b:'#B4B2A9' },
}

const PRI = {
  high:   { bg:'#FCEBEB', t:'#791F1F', b:'#F09595', l:'High' },
  normal: { bg:'#E6F1FB', t:'#0C447C', b:'#85B7EB', l:'Normal' },
  low:    { bg:'#EAF3DE', t:'#27500A', b:'#97C459', l:'Low' },
}

const SC = {
  Active:    { bg:'#E1F5EE', t:'#085041', b:'#5DCAA5' },
  'On Hold': { bg:'#FAEEDA', t:'#633806', b:'#EF9F27' },
  Complete:  { bg:'#EAF3DE', t:'#27500A', b:'#97C459' },
}

function tag(label, color) {
  const c = PC[color] || PC.Other
  return <span style={{display:'inline-block',background:c.bg,color:c.t,border:`1px solid ${c.b}`,fontSize:11,padding:'2px 8px',borderRadius:2,fontWeight:500,whiteSpace:'nowrap'}}>{label}</span>
}

function priTag(p) {
  const c = PRI[p] || PRI.normal
  return <span style={{display:'inline-block',background:c.bg,color:c.t,border:`1px solid ${c.b}`,fontSize:11,padding:'2px 8px',borderRadius:2,fontWeight:500}}>{c.l}</span>
}

function statTag(s) {
  const c = SC[s] || SC.Active
  return <span style={{display:'inline-block',background:c.bg,color:c.t,border:`1px solid ${c.b}`,fontSize:11,padding:'2px 8px',borderRadius:2,fontWeight:500}}>{s}</span>
}

function classifyProject(text) {
  const t = (text || '').toLowerCase()
  if (t.includes('syndigo')) return 'Syndigo'
  if (t.includes('sample')) return 'Samples'
  if (t.includes('coupon')) return 'Coupons'
  if (t.includes('present') || t.includes('deck') || t.includes('slide')) return 'Presentations'
  if (t.includes('jotform') || t.includes('form submission')) return 'Jotform'
  if (t.includes('chatbot') || t.includes('widget') || t.includes('bot')) return 'Chatbot'
  if (t.includes('iri') || t.includes('nielsen')) return 'IRI'
  if (t.includes('hh panel') || t.includes('household')) return 'HH Panel'
  return 'Other'
}

export default function App() {
  const [authed, setAuthed] = useState(false)
  const [page, setPage] = useState('dashboard')
  const [emails, setEmails] = useState([])
  const [tasks, setTasks] = useState([])
  const [meetings, setMeetings] = useState([])
  const [projects, setProjects] = useState(PROJECTS)
  const [projData, setProjData] = useState(Object.fromEntries(PROJECTS.map(p => [p, { status: 'Active', notes: '' }])))
  const [selectedEmail, setSelectedEmail] = useState(null)
  const [loading, setLoading] = useState({ gmail: false, calendar: false, drive: false, agent: false, triage: false })
  const [chat, setChat] = useState([{ role: 'agent', text: 'Hi Kim! I\'m your WorkHub agent. Connect your Gmail to get started, then I can triage emails, fix classifications, draft replies, and manage tasks.' }])
  const [chatInput, setChatInput] = useState('')
  const [newTask, setNewTask] = useState('')
  const [newProj, setNewProj] = useState('')
  const [compose, setCompose] = useState(null)
  const [toast, setToast] = useState(null)
  const chatEnd = useRef(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('error')) showToast('Auth error: ' + params.get('error'), 'error')
    checkAuth()
  }, [])

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [chat])

  async function checkAuth() {
    const res = await fetch('/api/gmail').catch(() => null)
    if (res?.ok) {
      setAuthed(true)
      const data = await res.json()
      if (data.emails) loadEmails(data.emails)
    }
  }

  function loadEmails(raw) {
    const mapped = raw.map(e => ({
      ...e,
      project: classifyProject(e.subject + ' ' + e.preview + ' ' + e.from),
    }))
    setEmails(mapped)
  }

  function showToast(msg, type = 'info') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function syncGmail() {
    setLoading(l => ({ ...l, gmail: true }))
    try {
      const res = await fetch('/api/gmail')
      if (res.status === 401) { window.location.href = '/api/auth/login'; return }
      const data = await res.json()
      if (data.emails) { loadEmails(data.emails); setAuthed(true); showToast(`${data.emails.length} emails loaded`, 'success') }
    } catch (e) { showToast('Gmail sync failed', 'error') }
    setLoading(l => ({ ...l, gmail: false }))
  }

  async function syncCalendar() {
    setLoading(l => ({ ...l, calendar: true }))
    try {
      const res = await fetch('/api/calendar')
      if (res.status === 401) { window.location.href = '/api/auth/login'; return }
      const data = await res.json()
      if (data.events) {
        setMeetings(data.events.map(e => ({ ...e, project: classifyProject(e.title + ' ' + e.description) })))
        showToast(`${data.events.length} events loaded`, 'success')
      }
    } catch (e) { showToast('Calendar sync failed', 'error') }
    setLoading(l => ({ ...l, calendar: false }))
  }

  async function syncDrive() {
    setLoading(l => ({ ...l, drive: true }))
    try {
      const res = await fetch('/api/drive')
      if (res.status === 401) { window.location.href = '/api/auth/login'; return }
      const data = await res.json()
      if (data.files) {
        const byProj = {}
        data.files.forEach(f => {
          const p = classifyProject(f.name)
          if (!byProj[p]) byProj[p] = []
          byProj[p].push({ name: f.name, link: f.webViewLink, modified: f.modifiedTime?.slice(0, 10) })
        })
        setProjData(prev => {
          const u = { ...prev }
          Object.entries(byProj).forEach(([p, files]) => { if (u[p]) u[p] = { ...u[p], driveFiles: files } })
          return u
        })
        showToast(`${data.files.length} Drive files linked`, 'success')
      }
    } catch (e) { showToast('Drive sync failed', 'error') }
    setLoading(l => ({ ...l, drive: false }))
  }

  async function runTriage() {
    setLoading(l => ({ ...l, triage: true }))
    try {
      const res = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails, projects }),
      })
      const data = await res.json()
      if (data.results) {
        let newTasks = [...tasks]
        setEmails(prev => prev.map(e => {
          const r = data.results.find(x => String(x.id) === String(e.id))
          if (!r) return e
          if (r.hasTask && r.taskText) newTasks.push({ id: Date.now() + Math.random(), text: r.taskText, project: r.project, done: false })
          return { ...e, project: r.project || e.project, priority: r.priority, needsReply: r.needsReply, waitingReply: r.waitingReply, read: true, agentReason: r.reason, agentLowConf: r.confidence === 'low' }
        }))
        setTasks(newTasks)
        showToast(`Triage complete — ${data.results.length} emails classified`, 'success')
        setChat(c => [...c, { role: 'agent', text: `Triage complete. Processed ${data.results.length} emails. ${data.results.filter(r => r.confidence === 'low').length} flagged for review. Anything look wrong?` }])
      }
    } catch (e) { showToast('Triage failed: ' + e.message, 'error') }
    setLoading(l => ({ ...l, triage: false }))
  }

  async function sendAgentMessage() {
    if (!chatInput.trim()) return
    const msg = chatInput.trim()
    setChatInput('')
    setChat(c => [...c, { role: 'user', text: msg }])
    setLoading(l => ({ ...l, agent: true }))
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, emails, tasks, projects, meetings }),
      })
      const data = await res.json()
      if (data.reply) setChat(c => [...c, { role: 'agent', text: data.reply }])
      if (data.actions) {
        if (data.actions.emailUpdates?.length) {
          setEmails(prev => prev.map(e => {
            const u = data.actions.emailUpdates.find(x => String(x.id) === String(e.id))
            return u ? { ...e, ...u, manualOverride: true, agentLowConf: false } : e
          }))
        }
        if (data.actions.newTasks?.length) {
          setTasks(prev => [...prev, ...data.actions.newTasks.map((t, i) => ({ id: Date.now() + i, done: false, ...t }))])
        }
        if (data.actions.draftReply) {
          setCompose(data.actions.draftReply)
        }
      }
    } catch (e) { setChat(c => [...c, { role: 'agent', text: 'Error: ' + e.message }]) }
    setLoading(l => ({ ...l, agent: false }))
  }

  async function sendEmail() {
    if (!compose) return
    try {
      const res = await fetch('/api/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(compose),
      })
      const data = await res.json()
      if (data.success) {
        showToast('Email sent!', 'success')
        setCompose(null)
        setEmails(prev => prev.map(e => e.id === compose.replyToId ? { ...e, needsReply: false } : e))
      }
    } catch (e) { showToast('Send failed', 'error') }
  }

  function moveEmail(id, project) {
    setEmails(prev => prev.map(e => e.id === id ? { ...e, project, manualOverride: true, agentLowConf: false } : e))
    if (selectedEmail?.id === id) setSelectedEmail(e => ({ ...e, project }))
  }

  function changePriority(id, priority) {
    setEmails(prev => prev.map(e => e.id === id ? { ...e, priority, manualOverride: true } : e))
    if (selectedEmail?.id === id) setSelectedEmail(e => ({ ...e, priority }))
  }

  const today = new Date().toISOString().slice(0, 10)
  const cp = page.startsWith('proj:') ? page.replace('proj:', '') : null
  const unread = emails.filter(e => !e.read).length
  const needsReplyCount = emails.filter(e => e.needsReply).length
  const waitingCount = emails.filter(e => e.waitingReply).length
  const highCount = emails.filter(e => e.priority === 'high').length
  const lowConf = emails.filter(e => e.agentLowConf)

  const SyncBtn = ({ k, label, fn }) => (
    <button onClick={fn} disabled={loading[k]} style={{ fontSize: 10, padding: '3px 9px', borderRadius: 2, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.12)' }}>
      {loading[k] ? '...' : label}
    </button>
  )

  function EmailRow({ e, showProject = true }) {
    const c = PC[e.project] || PC.Other
    const sel = selectedEmail?.id === e.id
    return (
      <div onClick={() => setSelectedEmail(sel ? null : e)}
        style={{ padding: '12px 20px', borderBottom: '1px solid #e8e8e4', cursor: 'pointer', background: sel ? c.bg : 'transparent', borderLeft: `4px solid ${sel ? c.a : 'transparent'}` }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 2, background: c.a, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
            {(e.from || '').split('@')[0].slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <span style={{ fontSize: 13, fontWeight: e.read ? 400 : 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {(e.from || '').split('@')[0].replace(/\./g, ' ')}
              </span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                {e.agentLowConf && <span style={{ fontSize: 10, background: '#FAEEDA', color: '#633806', border: '1px solid #EF9F27', padding: '1px 6px', borderRadius: 2 }}>review</span>}
                {priTag(e.priority)}
                <span style={{ fontSize: 11, color: '#888' }}>{e.date}</span>
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: e.read ? 400 : 500, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.subject}</div>
            <div style={{ fontSize: 12, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.preview}</div>
            {showProject && <div style={{ marginTop: 5 }}>{tag(e.project, e.project)}</div>}
          </div>
        </div>
      </div>
    )
  }

  function EmailDetail({ email }) {
    const c = PC[email.project] || PC.Other
    return (
      <div style={{ background: '#fff', borderTop: `4px solid ${c.a}`, border: `1px solid ${c.b}` }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e8e8e4' }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, lineHeight: 1.4 }}>{email.subject}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: '#555' }}>{email.from}</span>
            <span style={{ color: '#ccc' }}>·</span>
            <span style={{ fontSize: 12, color: '#888' }}>{email.date}</span>
            {priTag(email.priority)}
            {tag(email.project, email.project)}
            {email.needsReply && <span style={{ fontSize: 11, background: '#FCEBEB', color: '#791F1F', border: '1px solid #F09595', padding: '2px 8px', borderRadius: 2 }}>Needs reply</span>}
            {email.waitingReply && <span style={{ fontSize: 11, background: '#FAEEDA', color: '#633806', border: '1px solid #EF9F27', padding: '2px 8px', borderRadius: 2 }}>Waiting on response</span>}
          </div>
          {email.agentReason && (
            <div style={{ padding: '8px 12px', background: email.agentLowConf ? '#FAEEDA' : '#EEEDFE', border: `1px solid ${email.agentLowConf ? '#EF9F27' : '#AFA9EC'}`, borderRadius: 2, fontSize: 12, color: email.agentLowConf ? '#633806' : '#3C3489' }}>
              {email.agentLowConf ? '⚠ Uncertain: ' : 'Agent: '}{email.agentReason}
            </div>
          )}
        </div>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e8e8e4' }}>
          <div style={{ fontSize: 13, lineHeight: 1.8, color: '#444', whiteSpace: 'pre-wrap' }}>{email.body || email.preview}</div>
          {email.files?.length > 0 && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {email.files.map(f => <span key={f} style={{ fontSize: 12, background: '#f4f4f0', border: '1px solid #e0e0dc', padding: '4px 12px', borderRadius: 2 }}>📎 {f}</span>)}
            </div>
          )}
        </div>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #e8e8e4', background: '#fafaf8' }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Move to project</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[...projects, 'Other'].map(p => {
              const pc = PC[p] || PC.Other
              const active = email.project === p
              return <button key={p} onClick={() => moveEmail(email.id, p)} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 2, background: active ? pc.a : '#fff', color: active ? '#fff' : '#555', border: active ? `1px solid ${pc.a}` : '1px solid #d0d0cc', fontWeight: active ? 600 : 400 }}>{p}</button>
            })}
          </div>
        </div>
        <div style={{ padding: '12px 20px', background: '#fafaf8' }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Priority</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {['high', 'normal', 'low'].map(p => {
              const pc = PRI[p]; const active = email.priority === p
              return <button key={p} onClick={() => changePriority(email.id, p)} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 2, background: active ? pc.t : '#fff', color: active ? '#fff' : '#555', border: active ? `1px solid ${pc.t}` : '1px solid #d0d0cc', fontWeight: active ? 600 : 400 }}>{pc.l}</button>
            })}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setChat(c => [...c, { role: 'user', text: `Draft a reply to this email: "${email.subject}" from ${email.from}` }]); setPage('agent') }} style={{ fontSize: 12, padding: '7px 16px', background: c.a, color: '#fff', border: 'none', borderRadius: 2, fontWeight: 500 }}>Draft reply via agent</button>
            <button onClick={() => { setChatInput(`I think the email "${email.subject}" was miscategorized as ${email.project}. Can you help fix it?`); setPage('agent') }} style={{ fontSize: 12, padding: '7px 16px', borderRadius: 2 }}>Ask agent to fix</button>
          </div>
        </div>
      </div>
    )
  }

  const sideNav = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'inbox', label: 'Inbox', count: unread },
    { id: 'tasks', label: 'Tasks', count: tasks.filter(t => !t.done).length },
    { id: 'calendar', label: 'Calendar' },
    { id: 'agent', label: 'Agent chat' },
    null,
    ...projects.map(p => ({ id: 'proj:' + p, label: p, color: PC[p]?.a, count: emails.filter(e => e.project === p && !e.read).length || null })),
  ]

  function SectionHeader({ title, count, onExpand, accent = '#534AB7' }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px 10px', borderBottom: `2px solid ${accent}` }}>
        <div style={{ width: 3, height: 16, background: accent, flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', color: '#1a1a1a' }}>{title}</span>
        {count != null && <span style={{ fontSize: 12, color: '#888' }}>({count})</span>}
        {onExpand && <button onClick={onExpand} style={{ marginLeft: 'auto', fontSize: 11, padding: '3px 12px', color: '#666', border: '1px solid #d0d0cc', borderRadius: 2 }}>Expand</button>}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* Sidebar */}
      <div style={{ width: 220, background: '#16213e', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '20px 18px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: -0.5 }}>WorkHub</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>kim.diamond@truecitrus.com</div>
          <div style={{ marginTop: 12, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            <SyncBtn k="gmail" label="Gmail" fn={syncGmail} />
            <SyncBtn k="calendar" label="Cal" fn={syncCalendar} />
            <SyncBtn k="drive" label="Drive" fn={syncDrive} />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
          {sideNav.map((item, i) => {
            if (!item) return <div key={i} style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '8px 0' }} />
            const active = page === item.id
            return (
              <div key={item.id} onClick={() => setPage(item.id)}
                style={{ padding: '9px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, background: active ? 'rgba(255,255,255,0.09)' : 'transparent', borderLeft: `3px solid ${active ? (item.color || '#7F77DD') : 'transparent'}` }}>
                {item.color && <div style={{ width: 8, height: 8, background: item.color, borderRadius: 1, flexShrink: 0 }} />}
                <span style={{ fontSize: 13, color: active ? '#fff' : 'rgba(255,255,255,0.55)', fontWeight: active ? 500 : 400, flex: 1 }}>{item.label}</span>
                {item.count > 0 && <span style={{ fontSize: 10, background: '#E24B4A', color: '#fff', padding: '1px 6px', borderRadius: 2, fontWeight: 700 }}>{item.count}</span>}
              </div>
            )
          })}
          <div style={{ padding: '8px 18px', marginTop: 4 }}>
            <input value={newProj} onChange={e => setNewProj(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newProj.trim()) { setProjects(p => [...p, newProj]); setProjData(d => ({ ...d, [newProj]: { status: 'Active', notes: '' } })); setNewProj('') } }}
              placeholder="+ new project..." style={{ width: '100%', fontSize: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', padding: '5px 8px' }} />
          </div>
        </div>
        <div style={{ padding: '12px 18px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lowConf.length > 0 && <div style={{ background: '#FAEEDA', color: '#633806', border: '1px solid #EF9F27', padding: '6px 10px', borderRadius: 2, fontSize: 11, fontWeight: 500 }}>⚠ {lowConf.length} email{lowConf.length > 1 ? 's' : ''} need review</div>}
          <button onClick={runTriage} disabled={loading.triage} style={{ padding: '8px', background: loading.triage ? 'rgba(255,255,255,0.08)' : '#534AB7', color: '#fff', border: 'none', borderRadius: 2, fontWeight: 600, fontSize: 12 }}>
            {loading.triage ? 'Running...' : 'Run AI triage'}
          </button>
          {!authed && (
            <button onClick={() => window.location.href = '/api/auth/login'} style={{ padding: '7px', background: '#0F6E56', color: '#fff', border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 600 }}>
              Connect Gmail →
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Dashboard */}
        {page === 'dashboard' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div style={{ fontSize: 20, fontWeight: 600 }}>Good morning, Kim</div>

            {!authed && (
              <div style={{ background: '#EEEDFE', border: '1px solid #AFA9EC', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#26215C', marginBottom: 4 }}>Connect your Gmail to get started</div>
                  <div style={{ fontSize: 12, color: '#534AB7' }}>Sign in with kim.diamond@truecitrus.com to load real emails, calendar, and Drive files.</div>
                </div>
                <button onClick={() => window.location.href = '/api/auth/login'} style={{ padding: '10px 22px', background: '#534AB7', color: '#fff', border: 'none', borderRadius: 2, fontWeight: 600, fontSize: 13, flexShrink: 0 }}>Connect Gmail →</button>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 14 }}>
              {[{ l: 'Unread emails', v: unread, bg: '#FCEBEB', tc: '#791F1F', bc: '#F09595' }, { l: 'Needs reply', v: needsReplyCount, bg: '#E6F1FB', tc: '#0C447C', bc: '#85B7EB' }, { l: 'Waiting on', v: waitingCount, bg: '#FAEEDA', tc: '#633806', bc: '#EF9F27' }, { l: 'High priority', v: highCount, bg: '#FCEBEB', tc: '#791F1F', bc: '#F09595' }].map(c => (
                <div key={c.l} style={{ background: c.bg, border: `1px solid ${c.bc}`, padding: '18px 20px' }}>
                  <div style={{ fontSize: 12, color: c.tc, opacity: 0.7, marginBottom: 6, fontWeight: 500 }}>{c.l}</div>
                  <div style={{ fontSize: 34, fontWeight: 700, color: c.tc, lineHeight: 1 }}>{c.v}</div>
                </div>
              ))}
            </div>

            {lowConf.length > 0 && (
              <div style={{ background: '#FAEEDA', border: '1px solid #EF9F27', padding: '14px 20px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#412402', marginBottom: 10 }}>⚠ {lowConf.length} email{lowConf.length > 1 ? 's' : ''} need your review</div>
                {lowConf.map(e => (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0', borderTop: '1px solid rgba(186,117,23,0.2)' }}>
                    <span style={{ flex: 1, fontSize: 13, color: '#633806', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.subject}</span>
                    {tag(e.project, e.project)}
                    <button onClick={() => { setSelectedEmail(e); setPage('inbox') }} style={{ fontSize: 11, padding: '4px 12px', background: '#633806', color: '#fff', border: 'none', borderRadius: 2, flexShrink: 0 }}>Review</button>
                    <button onClick={() => { setChatInput(`The email "${e.subject}" from ${e.from} was classified as ${e.project} but I'm not sure that's right. What do you think?`); setPage('agent') }} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 2, flexShrink: 0 }}>Ask agent</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: 20 }}>
              <div style={{ background: '#fff', border: '1px solid #e8e8e4' }}>
                <SectionHeader title="Recent emails" count={emails.length} accent="#534AB7" onExpand={() => setPage('inbox')} />
                {emails.length === 0 && <div style={{ padding: 24, color: '#888', fontSize: 13 }}>Connect Gmail to load emails.</div>}
                {emails.slice(0, 5).map(e => <EmailRow key={e.id} e={e} />)}
                {selectedEmail && emails.slice(0, 5).find(e => e.id === selectedEmail.id) && <EmailDetail email={selectedEmail} />}
              </div>
              <div style={{ background: '#fff', border: '1px solid #e8e8e4' }}>
                <SectionHeader title="Tasks" count={tasks.filter(t => !t.done).length} accent="#0F6E56" onExpand={() => setPage('tasks')} />
                <div style={{ padding: '10px 20px', borderBottom: '1px solid #e8e8e4', display: 'flex', gap: 8 }}>
                  <input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newTask.trim()) { setTasks(t => [...t, { id: Date.now(), text: newTask, project: cp || '', done: false }]); setNewTask('') } }} placeholder="Add task..." style={{ flex: 1, fontSize: 13 }} />
                  <button onClick={() => { if (newTask.trim()) { setTasks(t => [...t, { id: Date.now(), text: newTask, project: '', done: false }]); setNewTask('') } }} style={{ background: '#0F6E56', color: '#fff', border: 'none', borderRadius: 2, padding: '5px 14px' }}>Add</button>
                </div>
                {tasks.slice(0, 8).map(t => (
                  <div key={t.id} style={{ padding: '11px 20px', borderBottom: '1px solid #e8e8e4', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <input type="checkbox" checked={t.done} onChange={() => setTasks(p => p.map(x => x.id === t.id ? { ...x, done: !x.done } : x))} style={{ marginTop: 2 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, textDecoration: t.done ? 'line-through' : 'none', color: t.done ? '#aaa' : '#1a1a1a', marginBottom: 4 }}>{t.text}</div>
                      {t.project && <div>{tag(t.project, t.project)}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.6fr)', gap: 20 }}>
              <div style={{ background: '#fff', border: '1px solid #e8e8e4' }}>
                <SectionHeader title="Meetings" count={meetings.filter(m => m.date >= today).length} accent="#185FA5" onExpand={() => setPage('calendar')} />
                {meetings.length === 0 && <div style={{ padding: 24, color: '#888', fontSize: 13 }}>Sync Calendar to load meetings.</div>}
                {meetings.filter(m => m.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5).map(m => {
                  const c = PC[m.project] || PC.Other; const d = new Date(m.date + 'T12:00')
                  return (
                    <div key={m.id} style={{ padding: '12px 20px', borderBottom: '1px solid #e8e8e4', display: 'flex', gap: 14, alignItems: 'center' }}>
                      <div style={{ width: 44, textAlign: 'center', background: c.bg, border: `1px solid ${c.b}`, padding: '6px 0', flexShrink: 0 }}>
                        <div style={{ fontSize: 9, fontWeight: 600, color: c.t, textTransform: 'uppercase' }}>{d.toLocaleString('en-US', { month: 'short' })}</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: c.a, lineHeight: 1.1 }}>{d.getDate()}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{m.title}</div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontSize: 12, color: '#888' }}>{m.time}</span>
                          {tag(m.project, m.project)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div style={{ background: '#fff', border: '1px solid #e8e8e4' }}>
                <SectionHeader title="Projects" count={projects.length} accent="#993556" onExpand={() => setPage('projects')} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))' }}>
                  {projects.map(p => {
                    const c = PC[p] || PC.Other
                    return (
                      <div key={p} onClick={() => setPage('proj:' + p)} style={{ padding: '14px 16px', borderBottom: '1px solid #e8e8e4', borderRight: '1px solid #e8e8e4', cursor: 'pointer', borderTop: `3px solid ${c.a}` }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{p}</div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          {statTag(projData[p]?.status || 'Active')}
                          {emails.filter(e => e.project === p && !e.read).length > 0 && <span style={{ fontSize: 11, color: '#666' }}>{emails.filter(e => e.project === p && !e.read).length} new</span>}
                          {tasks.filter(t => t.project === p && !t.done).length > 0 && <span style={{ fontSize: 11, color: '#666' }}>{tasks.filter(t => t.project === p && !t.done).length} tasks</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Inbox */}
        {page === 'inbox' && (
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.2fr)', overflow: 'hidden' }}>
            <div style={{ borderRight: '1px solid #e8e8e4', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '2px solid #534AB7', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, background: '#fff' }}>
                <div style={{ width: 3, height: 18, background: '#534AB7' }} />
                <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>Inbox</span>
                <span style={{ fontSize: 12, color: '#888' }}>{unread} unread of {emails.length}</span>
                <button onClick={syncGmail} style={{ marginLeft: 'auto', fontSize: 11, padding: '3px 10px' }}>↻ Sync</button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>{emails.map(e => <EmailRow key={e.id} e={e} />)}</div>
            </div>
            <div style={{ overflowY: 'auto', background: '#f4f4f0' }}>
              {selectedEmail ? <EmailDetail email={selectedEmail} /> : <div style={{ padding: 32, color: '#888', fontSize: 13 }}>Select an email to read</div>}
            </div>
          </div>
        )}

        {/* Tasks */}
        {page === 'tasks' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <div style={{ background: '#fff', border: '1px solid #e8e8e4' }}>
              <SectionHeader title="All tasks" count={tasks.filter(t => !t.done).length} accent="#0F6E56" />
              <div style={{ padding: '10px 20px', borderBottom: '1px solid #e8e8e4', display: 'flex', gap: 8 }}>
                <input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newTask.trim()) { setTasks(t => [...t, { id: Date.now(), text: newTask, project: '', done: false }]); setNewTask('') } }} placeholder="Add task..." style={{ flex: 1, fontSize: 13 }} />
                <button onClick={() => { if (newTask.trim()) { setTasks(t => [...t, { id: Date.now(), text: newTask, project: '', done: false }]); setNewTask('') } }} style={{ background: '#0F6E56', color: '#fff', border: 'none', borderRadius: 2, padding: '6px 16px' }}>Add</button>
              </div>
              {tasks.map(t => (
                <div key={t.id} style={{ padding: '14px 20px', borderBottom: '1px solid #e8e8e4', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <input type="checkbox" checked={t.done} onChange={() => setTasks(p => p.map(x => x.id === t.id ? { ...x, done: !x.done } : x))} style={{ marginTop: 2 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, textDecoration: t.done ? 'line-through' : 'none', color: t.done ? '#aaa' : '#1a1a1a', marginBottom: 6 }}>{t.text}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {t.project && tag(t.project, t.project)}
                      {t.due && <span style={{ fontSize: 12, color: '#888' }}>Due {t.due}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Calendar */}
        {page === 'calendar' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <div style={{ background: '#fff', border: '1px solid #e8e8e4' }}>
              <div style={{ padding: '14px 20px', borderBottom: '2px solid #185FA5', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 3, height: 18, background: '#185FA5' }} />
                <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>Calendar</span>
                <button onClick={syncCalendar} style={{ marginLeft: 'auto', fontSize: 11, padding: '3px 10px' }}>↻ Sync</button>
              </div>
              {meetings.length === 0 && <div style={{ padding: 24, color: '#888', fontSize: 13 }}>Sync Calendar to load your meetings.</div>}
              {meetings.sort((a, b) => a.date.localeCompare(b.date)).map(m => {
                const c = PC[m.project] || PC.Other; const d = new Date(m.date + 'T12:00')
                return (
                  <div key={m.id} style={{ padding: '16px 20px', borderBottom: '1px solid #e8e8e4', display: 'flex', gap: 16, alignItems: 'center', borderLeft: `4px solid ${c.a}` }}>
                    <div style={{ width: 56, textAlign: 'center', background: c.bg, border: `1px solid ${c.b}`, padding: '8px 0', flexShrink: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: c.t, textTransform: 'uppercase' }}>{d.toLocaleString('en-US', { month: 'short' })}</div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: c.a, lineHeight: 1.1 }}>{d.getDate()}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>{m.title}</div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <span style={{ fontSize: 13, color: '#888' }}>{m.time}</span>
                        {tag(m.project, m.project)}
                      </div>
                      {m.description && <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{m.description}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Agent chat */}
        {page === 'agent' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '2px solid #534AB7', background: '#fff', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <div style={{ width: 3, height: 18, background: '#534AB7' }} />
              <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>Agent</span>
              <span style={{ fontSize: 12, color: '#888' }}>Ask me anything about your emails, tasks, or projects</span>
              <button onClick={runTriage} disabled={loading.triage} style={{ marginLeft: 'auto', fontSize: 12, padding: '6px 14px', background: '#534AB7', color: '#fff', border: 'none', borderRadius: 2 }}>
                {loading.triage ? 'Running...' : 'Run triage'}
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12, background: '#f4f4f0' }}>
              {chat.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexDirection: m.role === 'agent' ? 'row' : 'row-reverse' }}>
                  {m.role === 'agent' && <div style={{ width: 32, height: 32, background: '#534AB7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, borderRadius: 2, flexShrink: 0 }}>AI</div>}
                  <div style={{ maxWidth: '75%', background: m.role === 'agent' ? '#fff' : '#534AB7', color: m.role === 'agent' ? '#1a1a1a' : '#fff', border: m.role === 'agent' ? '1px solid #e8e8e4' : 'none', padding: '12px 16px', borderRadius: 2, fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {m.text}
                  </div>
                </div>
              ))}
              {loading.agent && (
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 32, height: 32, background: '#534AB7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, borderRadius: 2 }}>AI</div>
                  <div style={{ background: '#fff', border: '1px solid #e8e8e4', padding: '12px 16px', borderRadius: 2, fontSize: 13, color: '#888' }}>Thinking...</div>
                </div>
              )}
              <div ref={chatEnd} />
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid #e8e8e4', background: '#fff', display: 'flex', gap: 10, flexShrink: 0 }}>
              <textarea value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAgentMessage() } }}
                placeholder='Try: "Move the Syndigo email to high priority" or "Draft a reply to the coupon email"'
                rows={2} style={{ flex: 1, fontSize: 13, resize: 'none', lineHeight: 1.5, padding: '8px 12px' }} />
              <button onClick={sendAgentMessage} disabled={loading.agent} style={{ padding: '0 20px', background: '#534AB7', color: '#fff', border: 'none', borderRadius: 2, fontSize: 13, fontWeight: 500, alignSelf: 'stretch' }}>Send</button>
            </div>
            <div style={{ padding: '8px 20px', background: '#f4f4f0', borderTop: '1px solid #e8e8e4', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['Triage all emails', 'Show emails needing reply', 'What tasks are overdue?', 'Draft reply to most recent high priority email', 'Fix any low-confidence classifications'].map(s => (
                <button key={s} onClick={() => setChatInput(s)} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 2, color: '#555' }}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {/* Project page */}
        {cp && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 12, height: 32, background: PC[cp]?.a || '#888' }} />
              <div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{cp}</div>
                <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>{emails.filter(e => e.project === cp).length} emails · {tasks.filter(t => t.project === cp && !t.done).length} open tasks</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                {statTag(projData[cp]?.status || 'Active')}
                <select value={projData[cp]?.status || 'Active'} onChange={e => setProjData(d => ({ ...d, [cp]: { ...d[cp], status: e.target.value } }))}>
                  {['Active', 'On Hold', 'Complete'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)', gap: 20 }}>
              <div style={{ background: '#fff', border: '1px solid #e8e8e4' }}>
                <SectionHeader title="Emails" count={emails.filter(e => e.project === cp).length} accent={PC[cp]?.a || '#888'} />
                {emails.filter(e => e.project === cp).length === 0 && <div style={{ padding: 24, color: '#888', fontSize: 13 }}>No emails for this project yet.</div>}
                {emails.filter(e => e.project === cp).map(e => <EmailRow key={e.id} e={e} showProject={false} />)}
                {selectedEmail && emails.filter(e => e.project === cp).find(e => e.id === selectedEmail.id) && <EmailDetail email={selectedEmail} />}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: '#fff', border: '1px solid #e8e8e4' }}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid #e8e8e4', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>Notes</div>
                  <div style={{ padding: '14px 20px' }}>
                    <textarea rows={5} value={projData[cp]?.notes || ''} onChange={e => setProjData(d => ({ ...d, [cp]: { ...d[cp], notes: e.target.value } }))} placeholder="Notes, links, memos..." style={{ width: '100%', fontSize: 13, resize: 'vertical', lineHeight: 1.6, padding: 10 }} />
                  </div>
                </div>
                <div style={{ background: '#fff', border: '1px solid #e8e8e4' }}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid #e8e8e4', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>Tasks</div>
                  <div style={{ padding: '10px 20px', borderBottom: '1px solid #e8e8e4', display: 'flex', gap: 8 }}>
                    <input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newTask.trim()) { setTasks(t => [...t, { id: Date.now(), text: newTask, project: cp, done: false }]); setNewTask('') } }} placeholder="Add task..." style={{ flex: 1, fontSize: 13 }} />
                    <button onClick={() => { if (newTask.trim()) { setTasks(t => [...t, { id: Date.now(), text: newTask, project: cp, done: false }]); setNewTask('') } }} style={{ background: PC[cp]?.a || '#534AB7', color: '#fff', border: 'none', borderRadius: 2, padding: '5px 14px' }}>Add</button>
                  </div>
                  {tasks.filter(t => t.project === cp).map(t => (
                    <div key={t.id} style={{ padding: '11px 20px', borderBottom: '1px solid #e8e8e4', display: 'flex', gap: 12, alignItems: 'center' }}>
                      <input type="checkbox" checked={t.done} onChange={() => setTasks(p => p.map(x => x.id === t.id ? { ...x, done: !x.done } : x))} />
                      <span style={{ fontSize: 13, flex: 1, textDecoration: t.done ? 'line-through' : 'none', color: t.done ? '#aaa' : '#1a1a1a' }}>{t.text}</span>
                    </div>
                  ))}
                </div>
                {projData[cp]?.driveFiles?.length > 0 && (
                  <div style={{ background: '#fff', border: '1px solid #e8e8e4' }}>
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid #e8e8e4', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>Drive files</div>
                    <div style={{ padding: '14px 20px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {projData[cp].driveFiles.map((f, i) => (
                        <a key={i} href={f.link} target="_blank" rel="noreferrer" style={{ fontSize: 12, background: '#f4f4f0', border: '1px solid #e0e0dc', padding: '4px 12px', borderRadius: 2, color: '#185FA5', textDecoration: 'none' }}>📄 {f.name}</a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Compose overlay */}
      {compose && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, width: 440, background: '#fff', border: '1px solid #d0d0cc', borderRadius: 2, zIndex: 200, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <div style={{ padding: '12px 16px', background: '#16213e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: '#fff' }}>Send email</span>
            <button onClick={() => setCompose(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 16 }}>×</button>
          </div>
          <div style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 3 }}>To: {compose.to}</div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>Subject: {compose.subject}</div>
            <textarea rows={7} value={compose.body} onChange={e => setCompose(c => ({ ...c, body: e.target.value }))} style={{ width: '100%', fontSize: 13, resize: 'vertical', lineHeight: 1.6, padding: 10, marginBottom: 10 }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setCompose(null)}>Discard</button>
              <button onClick={sendEmail} style={{ background: '#534AB7', color: '#fff', border: 'none', borderRadius: 2, padding: '7px 18px', fontWeight: 600 }}>Send via Gmail</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: toast.type === 'success' ? '#0F6E56' : toast.type === 'error' ? '#A32D2D' : '#534AB7', color: '#fff', padding: '9px 22px', borderRadius: 2, fontSize: 12, fontWeight: 600, zIndex: 400, whiteSpace: 'nowrap', boxShadow: '0 2px 12px rgba(0,0,0,0.2)' }}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
