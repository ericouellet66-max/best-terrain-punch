'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { useAuth } from '@/components/auth-provider'
import { NavigateurSemaine, semaineCourante } from '@/components/navigateur-semaine'
import { Chargement, MessageErreur } from '@/components/ui-terrain'
import { chargerPunchs, nomJob } from '@/lib/donnees'
import { useEmployes, useJobs } from '@/lib/hooks'
import { calculerSegments, LIBELLES_PUNCH, totalSegments, totauxParJour } from '@/lib/punch'
import { ajouterJours, cleJour, debutJour, duree, heure, joursDeSemaine, libelleJour } from '@/lib/temps'
import { EMPLOYEURS, type Employeur, type Punch } from '@/lib/types'

export function Historique() {
  const { employe, estAdmin } = useAuth()
  const { data: employes } = useEmployes()
  const [employeChoisi, setEmployeChoisi] = useState<string>('')
  const idHistorique = estAdmin && employeChoisi ? employeChoisi : employe?.id
  const nomHistorique = employes?.find(e => String(e.id) === String(idHistorique))?.nom
  const [dimanche, setDimanche] = useState(semaineCourante)
  const [employeur, setEmployeur] = useState<Employeur>('best')
  const { data: jobs } = useJobs(false)
  const { data: punchs, error, isLoading } = useSWR(
    idHistorique != null ? ['punchs-historique', String(idHistorique), dimanche] : null,
    () =>
      chargerPunchs({
        employeId: idHistorique,
        depuis: debutJour(dimanche),
        jusqua: debutJour(ajouterJours(dimanche, 7)),
      }),
  )

  const { totaux, total, parJour } = useMemo(() => {
    const selection = (punchs ?? []).filter(p => p.employeur === employeur)
    const segments = calculerSegments(selection)
    const groupes = new Map<string, Punch[]>()
    for (const p of selection) {
      const cle = cleJour(new Date(p.horodatage))
      groupes.set(cle, [...(groupes.get(cle) ?? []), p])
    }
    return { totaux: totauxParJour(segments), total: totalSegments(segments), parJour: groupes }
  }, [punchs, employeur])

  const jours = joursDeSemaine(dimanche).reverse()

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-3xl font-bold uppercase">{estAdmin ? 'Historique des punchs' : 'Mon historique'}</h1>
      {estAdmin && (
        <label className="flex flex-col gap-2 text-sm font-semibold">
          Choisir un employé
          <select
            aria-label="Choisir un employé"
            value={employeChoisi}
            onChange={(e) => setEmployeChoisi(e.target.value)}
            className="h-12 w-full rounded-xl border border-border bg-card px-3 text-foreground"
          >
            <option value="">Mes punchs ({employe?.nom ?? "Moi"})</option>
            {(employes ?? []).map(e => (
              <option key={String(e.id)} value={String(e.id)}>{e.nom ?? 'Employé sans nom'}</option>
            ))}
          </select>
        </label>
      )}
      {estAdmin && <p className="text-sm text-muted-foreground">Historique de : {nomHistorique ?? employe?.nom ?? 'Moi'}</p>}
      <div className="grid grid-cols-2 gap-2">{(Object.keys(EMPLOYEURS) as Employeur[]).map(k => <button key={k} onClick={() => setEmployeur(k)} className={`rounded-xl border-2 p-3 text-sm font-semibold ${employeur === k ? 'border-primary bg-primary/15' : 'border-border'}`}>{EMPLOYEURS[k]}</button>)}</div>
      <NavigateurSemaine dimanche={dimanche} onChanger={setDimanche} />

      <div className="flex items-center justify-between rounded-2xl bg-primary p-4 text-primary-foreground">
        <p className="font-display text-xl font-bold uppercase">Total semaine</p>
        <p className="font-display text-4xl font-extrabold tabular-nums">{duree(total)}</p>
      </div>

      {error && <MessageErreur>{(error as Error).message}</MessageErreur>}
      {isLoading ? (
        <Chargement />
      ) : (
        <ul className="flex flex-col gap-3">
          {jours.map((jour) => {
            const liste = parJour.get(jour) ?? []
            if (liste.length === 0 && !totaux.get(jour)) {
              return (
                <li key={jour} className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-muted-foreground">
                  <span>{libelleJour(jour, true)}</span>
                  <span className="text-sm">Aucun punch</span>
                </li>
              )
            }
            return (
              <li key={jour} className="rounded-2xl border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <span className="font-semibold">{libelleJour(jour, true)}</span>
                  <span className="font-display text-xl font-bold tabular-nums text-primary">
                    {duree(totaux.get(jour) ?? 0)}
                  </span>
                </div>
                <ol className="flex flex-col divide-y divide-border">
                  {liste.map((p) => (
                    <li key={String(p.id)} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      <span className="w-12 font-semibold tabular-nums">{heure(p.horodatage)}</span>
                      <span className="flex-1">
                        {LIBELLES_PUNCH[p.type] ?? p.type}
                        {(p.type === 'arrivee' || p.type === 'changement_job') && (
                          <span className="block text-xs text-muted-foreground">{nomJob(jobs, p.job_id)}</span>
                        )}
                      </span>
                      {p.modifie_le && <span className="text-xs text-primary">corrigé</span>}
                    </li>
                  ))}
                </ol>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
