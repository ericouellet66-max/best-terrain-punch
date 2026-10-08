'use client'

import { MapPin } from 'lucide-react'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { Chargement, MessageErreur } from '@/components/ui-terrain'
import { chargerPhotosJob, nomEmploye, nomJob, urlPhotoJob } from '@/lib/donnees'
import { lienCarte } from '@/lib/gps'
import { useEmployes, useJobs } from '@/lib/hooks'
import { heure, libelleJour, cleJour } from '@/lib/temps'
import type { PhotoJob } from '@/lib/types'

function Photo({ photo }: { photo: PhotoJob }) {
  const [url, setUrl] = useState('')
  useEffect(() => { urlPhotoJob(photo.chemin).then(setUrl).catch(() => setUrl('')) }, [photo.chemin])
  return url ? <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={`Photo ${photo.type}`} className="h-40 w-full rounded-xl object-cover" /></a> : <div className="h-40 animate-pulse rounded-xl bg-secondary" />
}

export function AdminPhotos() {
  const { data: photos, error, isLoading } = useSWR('photos-jobs-admin', () => chargerPhotosJob(), { refreshInterval: 30000 })
  const { data: employes } = useEmployes()
  const { data: jobs } = useJobs(false)
  if (isLoading) return <Chargement />
  return <div className="flex flex-col gap-3">
    {error && <MessageErreur>{(error as Error).message}</MessageErreur>}
    {(photos ?? []).length === 0 && <p className="py-6 text-center text-muted-foreground">Aucune photo de job.</p>}
    <div className="grid gap-3 sm:grid-cols-2">
      {(photos ?? []).map((p) => <article key={String(p.id)} className="rounded-2xl border border-border bg-card p-3">
        <Photo photo={p} />
        {p.note && <p className="mt-2 whitespace-pre-wrap rounded-lg bg-secondary p-2 text-sm">{p.note}</p>}
        <div className="mt-2 flex items-start justify-between gap-2">
          <div><p className="font-semibold">{p.type === 'debut' ? 'Début' : 'Fin'} · {nomJob(jobs, p.job_id)}</p><p className="text-xs text-muted-foreground">{nomEmploye(employes, p.employe_id)} · {libelleJour(cleJour(new Date(p.horodatage)), true)} · {heure(p.horodatage)}</p></div>
          {p.latitude != null && p.longitude != null && <a href={lienCarte(p.latitude, p.longitude)} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-primary" aria-label="Voir le GPS"><MapPin className="size-5" /></a>}
        </div>
      </article>)}
    </div>
  </div>
}
