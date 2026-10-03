import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as authService from '../services/authService'
import { getTrackingContext } from '../services/attribution'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null })

  const refresh = useCallback(async () => {
    try {
      const { user } = await authService.getCurrentUser()
      setState({ status: 'authenticated', user })
      return user
    } catch (error) {
      if (error.status !== 401) console.error('Falha ao restaurar sessão', error)
      setState({ status: 'anonymous', user: null })
      return null
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const signIn = useCallback(async (credentials) => {
    const { user } = await authService.login(credentials)
    setState({ status: 'authenticated', user })
    return user
  }, [])

  const signUp = useCallback(async (data) => {
    const { user } = await authService.register({ ...data, ...getTrackingContext() })
    setState({ status: 'authenticated', user })
    return user
  }, [])

  const signOut = useCallback(async () => {
    await authService.logout()
    setState({ status: 'anonymous', user: null })
  }, [])

  const value = useMemo(() => ({ ...state, refresh, signIn, signOut, signUp }), [state, refresh, signIn, signOut, signUp])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
