'use client'

import { Clock, History, LogOut, Settings, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuth } from '@/components/auth-provider'
import { RappelsWatcher } from '@/components/rappels-watcher'
import { BoutonSecondaire, Chargement, Logo, MessageErreur } from '@/components/ui-terrain'
import { cn } from '@/lib/utils'

const LIENS = [
  { href: '/punch', label: 'Punch', icone: Clock },
  { href: '/historique', label: 'Historique', icone: History },
  { href: '/reglages', label: 'Réglages', icone: Settings },
]

export function AppShell({
  children,
  adminSeulement = false,
}: {
  children: React.ReactNode
  adminSeulement?: boolean
}) {
  const { pret, session, employe, chargementProfil, erreurProfil, estAdmin, deconnexion } = useAuth()
  const router = useRouter()
  const chemin = usePathname()

  useEffect(() => {
    if (pret && !session) router.replace('/')
  }, [pret, session, router])

  if (!pret || !session || chargementProfil) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <Chargement />
      </main>
    )
  }

  if (erreurProfil || !employe || !employe.actif) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 p-6 text-center">
        <Logo taille={140} />
        <MessageErreur>
          {erreurProfil
            ? `Erreur de chargement du profil : ${erreurProfil}`
            : !employe
              ? 'Votre compte n’est relié à aucune fiche employé. Contactez Éric ou Nathalie.'
              : 'Votre fiche employé est désactivée. Contactez un administrateur.'}
        </MessageErreur>
        <BoutonSecondaire onClick={deconnexion} className="w-full">
          <LogOut className="size-5" aria-hidden="true" />
          Se déconnecter
        </BoutonSecondaire>
      </main>
    )
  }

  const liens = estAdmin ? [...LIENS, { href: '/admin', label: 'Admin', icone: ShieldCheck }] : LIENS

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur">
        <Logo taille={48} className="rounded-lg" />
        <p className="font-display text-lg font-bold uppercase leading-none tracking-wide">
          B.E.S.T. <span className="text-primary">Terrain</span> Punch
        </p>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-4">
        {adminSeulement && !estAdmin ? (
          <MessageErreur>Accès réservé aux administrateurs.</MessageErreur>
        ) : (
          children
        )}
      </main>

      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="mx-auto flex max-w-3xl">
          {liens.map(({ href, label, icone: Icone }) => {
            const actif = chemin === href || chemin.startsWith(`${href}/`)
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  aria-current={actif ? 'page' : undefined}
                  className={cn(
                    'flex h-16 flex-col items-center justify-center gap-1 text-xs font-semibold',
                    actif ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  <Icone className="size-6" aria-hidden="true" />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <RappelsWatcher employeId={employe.id} />
    </div>
  )
}
