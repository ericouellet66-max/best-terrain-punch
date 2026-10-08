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
  const [onglet, setOnglet] = useState<Onglet>('heures')
  const { employe } = useAuth()
  const restreint = employe?.role === 'sous_admin'
  const ongletsVisibles = ONGLETS.filter(o => !restreint || ['punchs', 'heures'].includes(o.id))

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-3xl font-bold uppercase">Administration</h1>
      <div role="tablist" aria-label="Sections d’administration" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {ongletsVisibles.map((o) => (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={onglet === o.id}
            onClick={() => setOnglet(o.id)}
            className={cn(
              'h-11 shrink-0 rounded-full px-4 text-sm font-semibold transition',
              onglet === o.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {onglet === 'direct' && !restreint && <AdminDirect />}
        {onglet === 'notifications' && !restreint && <AdminNotifications />}
        {onglet === 'photos' && !restreint && <AdminPhotos />}
        {onglet === 'punchs' && <AdminPunchs />}
        {onglet === 'heures' && <AdminHeures />}
        {onglet === 'jobs' && !restreint && <AdminJobs />}
        {onglet === 'employes' && !restreint && <AdminEmployes />}
      </div>
    </div>
  )
}
