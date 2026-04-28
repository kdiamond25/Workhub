// Simple in-memory session store
const sessions = new Map()

export function setSession(id, data) {
  sessions.set(id, { ...data, created: Date.now() })
}

export function getSession(id) {
  const s = sessions.get(id)
  if (!s) return null
  if (Date.now() - s.created > 3500000) { sessions.delete(id); return null }
  return s
}

export function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36) + Math.random().toString(36).slice(2)
}
