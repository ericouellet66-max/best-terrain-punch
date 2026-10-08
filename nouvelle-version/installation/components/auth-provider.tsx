'use client'

import type { Session } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import useSWR from 'swr'
import { getSupabase } from '@/lib/supabase'
import type { Employe } from '@/lib/types'

interface ContexteAuth {
  pret: boolean
  session: Session | null
  employe: Employe | null
  chargementProfil: boolean
  erreurProfil: string | null
  estAdmin: boolean
  deconnexion: () => Promise<void>
}

const Contexte = createContext<ContexteAuth | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [pret, setPret] = useState(false)

  useEffect(() => {
    const supabase = getSupabase()
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setPret(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_evenement, nouvelle) => {
      setSession(nouvelle)
      setPret(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const uid = session?.user.id
  const { data, error, isLoading } = useSWR(uid ? ['moi', uid] : null, async () => {
    const { data: fiche, error: err } = await getSupabase()
      .from('employes')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle()
    if (err) throw new Error(err.message)
    return fiche as Employe | null
  })

  const deconnexion = useCallback(async () => {
    await getSupabase().auth.signOut()
  }, [])

  const employe = data ?? null

  return (
    <Contexte.Provider
      value={{
        pret,
        session,
        employe,
        chargementProfil: Boolean(uid) && isLoading,
        erreurProfil: error ? (error as Error).message : null,
        estAdmin: employe?.role === 'admin' && employe.actif,
        deconnexion,
      }}
    >
      {children}
    </Contexte.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(Contexte)
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider')
  return ctx
}
