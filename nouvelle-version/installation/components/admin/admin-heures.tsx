'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { NavigateurSemaine, semaineCourante } from '@/components/navigateur-semaine'
import { Chargement, MessageErreur } from '@/components/ui-terrain'
import { chargerPunchs } from '@/lib/donnees'
import { useEmployes } from '@/lib/hooks'
import { calculerSegments, grouperParEmploye, totalSegments, totauxParJour } from '@/lib/punch'
import { ajouterJours, debutJour, duree, heuresDecimales, joursDeSemaine, libelleJour } from '@/lib/temps'

export function AdminHeures() {
  const [employeur, setEmployeur] = useState<'best'|'ferme'>('best')
  const [dimanche, setDimanche] = useState(semaineCourante)
  const { data: employes } = useEmployes()
  // Inclut la veille pour qu'un quart commencé samedi soir soit bien reconstruit.
  const { data: punchs, error, isLoading } = useSWR(['punchs-heures', dimanche], () =>
    chargerPunchs({ depuis: debutJour(ajouterJours(dimanche, -1)), jusqua: debutJour(ajouterJours(dimanche, 7)) }),
  )
  const jours = joursDeSemaine(dimanche)

  const lignes = useMemo(() => {
    const groupes = grouperParEmploye((punchs ?? []).filter(p => p.employeur === employeur))
    return (employes ?? [])
      .map((e) => {
        const segments = calculerSegments(groupes.get(String(e.id)) ?? []).filter(
          (s) => s.debut >= debutJour(dimanche),
        )
        return { employe: e, parJour: totauxParJour(segments), total: totalSegments(segments) }
      })
      .filter((l) => l.employe.actif || l.total > 0)
  }, [employes, punchs, dimanche, employeur])

  const grandTotal = lignes.reduce((t, l) => t + l.total, 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2"><button onClick={() => setEmployeur('best')} className={`rounded-xl border-2 p-3 ${employeur==='best'?'border-primary bg-primary/15':'border-border'}`}>B.E.S.T. Terrain</button><button onClick={() => setEmployeur('ferme')} className={`rounded-xl border-2 p-3 ${employeur==='ferme'?'border-primary bg-primary/15':'border-border'}`}>Ferme Denis St-Pierre</button></div>
      <NavigateurSemaine dimanche={dimanche} onChanger={setDimanche} />
      <div className="flex items-center justify-between rounded-2xl bg-primary p-4 text-primary-foreground">
        <p className="font-display text-xl font-bold uppercase">Total équipe</p>
        <p className="font-display text-3xl font-extrabold tabular-nums">{duree(grandTotal)}</p>
      </div>
      {error && <MessageErreur>{(error as Error).message}</MessageErreur>}
      {isLoading ? (
        <Chargement />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th scope="col" className="sticky left-0 bg-card px-3 py-2.5">Employé</th>
                {jours.map((j) => (
                  <th key={j} scope="col" className="px-2 py-2.5 text-right">{libelleJour(j)}</th>
                ))}
                <th scope="col" className="px-3 py-2.5 text-right text-primary">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lignes.map(({ employe, parJour, total }) => (
                <tr key={String(employe.id)}>
                  <th scope="row" className="sticky left-0 bg-card px-3 py-2.5 text-left font-semibold">
                    {employe.nom}
                  </th>
                  {jours.map((j) => (
                    <td key={j} className="px-2 py-2.5 text-right tabular-nums text-muted-foreground">
                      {parJour.get(j) ? heuresDecimales(parJour.get(j)!) : '—'}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-right font-bold tabular-nums text-primary">{duree(total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">Heures quotidiennes en heures décimales; pauses dîner et souper exclues.</p>
    </div>
  )
}
