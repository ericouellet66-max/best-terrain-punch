'use client'

import { useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import { AdminDirect } from '@/components/admin/admin-direct'
import { AdminEmployes } from '@/components/admin/admin-employes'
import { AdminHeures } from '@/components/admin/admin-heures'
import { AdminJobs } from '@/components/admin/admin-jobs'
import { AdminNotifications } from '@/components/admin/admin-notifications'
import { AdminPhotos } from '@/components/admin/admin-photos'
import { AdminPunchs } from '@/components/admin/admin-punchs'
import { cn } from '@/lib/utils'

const ONGLETS = [
  { id: 'direct', label: 'En direct' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'photos', label: 'Photos' },
  { id: 'punchs', label: 'Punchs' },
  { id: 'heures', label: 'Heures' },
  { id: 'jobs', label: 'Jobs' },
  { id: 'employes', label: 'Employés' },
] as const

type Onglet = (typeof ONGLETS)[number]['id']

export function AdminPanel() {
  const { employe } = useAuth()
  const estSousAdmin = employe?.role === 'sous_admin'
  const [onglet, setOnglet] = useState<Onglet>('direct')
  const ongletsVisibles = estSousAdmin ? ONGLETS.filter((o) => o.id === 'direct' || o.id === 'heures') : ONGLETS
  const ongletActif = estSousAdmin && onglet !== 'direct' && onglet !== 'heures' ? 'direct' : onglet

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-3xl font-bold uppercase">Administration</h1>
      <div role="tablist" aria-label="Sections d’administration" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {ongletsVisibles.map((o) => (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={ongletActif === o.id}
            onClick={() => setOnglet(o.id)}
            className={cn(
              'h-11 shrink-0 rounded-full px-4 text-sm font-semibold transition',
              ongletActif === o.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {ongletActif === 'direct' && <AdminDirect />}
        {ongletActif === 'notifications' && <AdminNotifications />}
        {ongletActif === 'photos' && <AdminPhotos />}
        {ongletActif === 'punchs' && <AdminPunchs />}
        {ongletActif === 'heures' && <AdminHeures />}
        {ongletActif === 'jobs' && <AdminJobs />}
        {ongletActif === 'employes' && <AdminEmployes />}
      </div>
    </div>
  )
}
