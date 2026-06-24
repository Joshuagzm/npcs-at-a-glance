import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  login as loginApi,
  register as registerApi,
  type AuthResponse,
} from '@/lib/api'
import {
  clearAuth,
  getStoredUser,
  getToken,
  setAuth,
  subscribe,
  type AuthUser,
} from '@/lib/auth'

type AuthContextValue = {
  user: AuthUser | null
  isAuthenticated: boolean
  login: (userName: string, password: string) => Promise<AuthResponse>
  register: (
    userName: string,
    password: string,
  ) => Promise<AuthResponse>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readSession() {
  return { token: getToken(), user: getStoredUser() }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(readSession)

  // Mirror any session change made elsewhere (login, logout, or the api layer
  // clearing the token on a 401) into React state.
  useEffect(() => subscribe(() => setSession(readSession())), [])

  const login = useCallback(async (userName: string, password: string) => {
    const result = await loginApi(userName, password)
    setAuth(result.token, result.user)
    return result
  }, [])

  const register = useCallback(
    async (userName: string, password: string) => {
      const result = await registerApi(userName, password)
      setAuth(result.token, result.user)
      return result
    },
    [],
  )

  const logout = useCallback(() => clearAuth(), [])

  return (
    <AuthContext.Provider
      value={{
        user: session.user,
        isAuthenticated: session.token !== null,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
