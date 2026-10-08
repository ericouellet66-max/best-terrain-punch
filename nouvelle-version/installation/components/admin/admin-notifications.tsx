'use client'

import { Bell, Check } from 'lucide-react'
import useSWR from 'swr'
import { Chargement, MessageErreur } from '@/components/ui-terrain'
import { chargerNotificationsAdmin, marquerNotificationLue, nomEmploye, nomJob } from '@/lib/donnees'
import { useEmployes, useJobs } from '@/lib/hooks'
import { heure } from '@/lib/temps'

export function AdminNotifications() {
  const { data: notifications, error, isLoading, mutate } = useSWR('notifications-admin', chargerNotificationsAdmin, { refreshInterval: 10000 })
  const { data: employes } = useEmployes()
  const { data: jobs } = useJobs(false)

  if (isLoading) return <Chargement />
  return <div className="flex flex-col gap-3">
    {error && <MessageErreur>{(error as Error).message}</MessageErreur>}
    <p className="text-sm text-muted-foreground">Les nouveaux punchs et les nouvelles photos apparaissent ici automatiquement.</p>
    <ul className="flex flex-col gap-2">
      {(notifications ?? []).map((n) => <li key={String(n.id)} className={`rounded-xl border p-3 ${n.lue ? 'border-border bg-card' : 'border-primary bg-primary/10'}`}>
        <div className="flex gap-3">
          <Bell className="mt-1 size-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{n.titre} · {heure(n.horodatage)}</p>
            <p className="text-sm">{n.message}</p>
            <p className="text-xs text-muted-foreground">{nomEmploye(employes, n.employe_id)} · {nomJob(jobs, n.job_id)}</p>
          </div>
          {!n.lue && <button className="rounded-lg p-2" aria-label="Marquer comme lue" onClick={async()=>{await marquerNotificationLue(n.id); await mutate()}}><Check className="size-5" /></button>}
        </div>
      </li>)}
    </ul>
  </div>
}
