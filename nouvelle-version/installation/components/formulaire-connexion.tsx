'use client'

import { LogIn } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import {
  BoutonPrincipal,
  Champ,
  Chargement,
  classeChamp,
  Logo,
  MessageErreur,
} from '@/components/ui-terrain'
import { getSupabase } from '@/lib/supabase'

export function FormulaireConnexion() {
  const { pret, session } = useAuth()
  const router = useRouter()
  const [courriel, setCourriel] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)

  useEffect(() => {
    if (pret && session) router.replace('/punch')
  }, [pret, session, router])

  async function soumettre(e: React.FormEvent) {
    e.preventDefault()
    setErreur(null)
    setEnvoi(true)
    const { error } = await getSupabase().auth.signInWithPassword({
      email: courriel.trim(),
      password: motDePasse,
    })
    setEnvoi(false)
    if (error) {
      setErreur(
        error.message === 'Invalid login credentials'
          ? 'Courriel ou mot de passe invalide.'
          : `Connexion impossible : ${error.message}`,
      )
    }
  }

  if (!pret || session) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <Chargement />
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-5 py-10">
      <div className="flex flex-col items-center gap-4 text-center">
        <Logo taille={220} className="h-auto w-[220px] max-w-[70vw]" />
        <p className="font-display text-xl font-bold uppercase tracking-wide">B.E.S.T. Terrain Punch</p>
      </div>

      <form onSubmit={soumettre} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
        <Champ label="Courriel">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={courriel}
            onChange={(e) => setCourriel(e.target.value)}
            className={classeChamp}
            placeholder="nom@exemple.com"
          />
        </Champ>
        <Champ label="Mot de passe">
          <input
            type="password"
            autoComplete="current-password"
            required
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            className={classeChamp}
          />
        </Champ>
        {erreur && <MessageErreur>{erreur}</MessageErreur>}
        <BoutonPrincipal type="submit" chargement={envoi} className="mt-2 h-16">
          {!envoi && <LogIn className="size-6" aria-hidden="true" />}
          Se connecter
        </BoutonPrincipal>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        Mot de passe oublié? Contactez Éric ou Nathalie.
      </p>
    </main>
  )
}
