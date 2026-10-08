'use client'

import { RefreshCw } from 'lucide-react'
import { useMemo } from 'react'
import useSWR from 'swr'
import { BoutonSecondaire, Chargement, MessageErreur } from '@/components/ui-terrain'
import { chargerPunchs, nomJob } from '@/lib/donnees'
import { useEmployes, useJobs } from '@/lib/hooks'
import { calculerEtat, calculerSegments, grouperParEmploye, LIBELLES_ETAT, totalSegments } from '@/lib/punch'
import { duree, heure } from '@/lib/temps'
import { cn } from '@/lib/utils'

export function AdminDirect() {
  const { data: employes, isLoading: chargeEmp } = useEmployes()
  const { data: jobs } = useJobs(false)
  const { data: punchs, error, isLoading, mutate } = useSWR(
    ['punchs-direct'],
    () => chargerPunchs({ depuis: new Date(Date.now() - 24 * 3600 * 1000) }),
    { refreshInterval: 30_000 },
  )

  const lignes = useMemo(() => {
    const groupes = grouperParEmploye(punchs ?? [])
    return (employes ?? [])
      .filter((e) => e.actif)
      .map((e) => {
        const liste = groupes.get(String(e.id)) ?? []
        const etat = calculerEtat(liste)
        const segments = calculerSegments(liste).filter((s) => etat.debutQuart && s.debut >= etat.debutQuart)
        return { employe: e, etat, heures: totalSegments(segments) }
      })
      .sort((a, b) => Number(a.etat.etat === 'non_punche') - Number(b.etat.etat === 'non_punche'))
  }, [employes, punchs])

  if (isLoading || chargeEmp) return <Chargement />
  const presents = lignes.filter((l) => l.etat.etat !== 'non_punche').length

  return (
    <div className="flex flex-col gap-3">
      {error && <MessageErreur>{(error as Error).message}</MessageErreur>}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-display text-3xl font-bold text-primary">{presents}</span> / {lignes.length} punchés
        </p>
        <BoutonSecondaire onClick={() => mutate()} aria-label="Actualiser">
          <RefreshCw className="size-5" aria-hidden="true" />
        </BoutonSecondaire>
      </div>
      <ul className="flex flex-col gap-2">
        {lignes.map(({ employe, etat, heures }) => (
          <li key={String(employe.id)} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            <span
              className={cn(
                'size-3 shrink-0 rounded-full',
                etat.etat === 'au_travail' && 'bg-success',
                (etat.etat === 'diner' || etat.etat === 'souper') && 'bg-primary',
                etat.etat === 'non_punche' && 'bg-muted-foreground',
              )}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{employe.nom}</p>
              <p className="truncate text-xs text-muted-foreground">
                {etat.etat === 'non_punche' ? 'Non punché' : nomJob(jobs, etat.jobId)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">{LIBELLES_ETAT[etat.etat]}</p>
              {etat.etat !== 'non_punche' && (
                <p className="text-xs text-muted-foreground tabular-nums">
                  {etat.depuis && `depuis ${heure(etat.depuis)} · `}
                  {duree(heures)}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
