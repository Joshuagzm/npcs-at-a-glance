// Auth session persisted to localStorage so a logged-in user survives refreshes.
// A tiny pub/sub lets React (AuthProvider) mirror changes made from anywhere —
// including the api layer clearing the session on a 401.

export interface AuthUser {
  id: string
  email: string | null
  userName: string | null
  roles: string[]
  createdAt: string
}

const TOKEN_KEY = 'npc-management:token'
const USER_KEY = 'npc-management:user'

type Listener = () => void
const listeners = new Set<Listener>()

function notify(): void {
  for (const listener of listeners) listener()
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

export function setAuth(token: string, user: AuthUser): void {
  try {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  } catch {
    // Storage unavailable (e.g. private mode) — the session just won't persist.
  }
  notify()
}

export function clearAuth(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  } catch {
    // ignore
  }
  notify()
}
