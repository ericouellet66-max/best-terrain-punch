'use client'

import { Plus } from 'lucide-react'
import { useState } from 'react'
import { BoutonPrincipal, Champ, Chargement, classeChamp, Feuille, MessageErreur } from '@/components/ui-terrain'
import { enregistrerJob } from '@/lib/donnees'
import { rafraichirJobs, useJobs } from '@/lib/hooks'
import { EMPLOYEURS, type Employeur, type Job } from '@/lib/types'
import { cn } from '@/lib/utils'

export function AdminJobs() {
  const { data: jobs, error, isLoading } = useJobs(false)
  const [edition, setEdition] = useState<Partial<Job> | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)

  async function sauver(champs: Partial<Job>, id?: Job['id']) {
    setEnvoi(true)
    setErreur(null)
    try {
      await enregistrerJob(champs, id)
      await rafraichirJobs()
      return true
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Erreur inconnue')
      return false
    } finally {
      setEnvoi(false)
    }
  }

  async function soumettre(e: React.FormEvent) {
    e.preventDefault()
    if (!edition?.nom?.trim()) return setErreur('Le nom du job est requis.')
    const ok = await sauver(
      {
        nom: edition.nom.trim(),
        client: edition.client?.trim() || null,
        adresse: edition.adresse?.trim() || null,
        actif: edition.actif ?? true,
        employeur: edition.employeur ?? 'best',
      },
      edition.id,
    )
    if (ok) setEdition(null)
  }

  if (isLoading) return <Chargement />

  return (
    <div className="flex flex-col gap-3">
      <BoutonPrincipal
        onClick={() => {
          setErreur(null)
          setEdition({ actif: true })
        }}
      >
        <Plus className="size-5" aria-hidden="true" />
        Créer un job
      </BoutonPrincipal>
      {(error || (erreur && !edition)) && <MessageErreur>{error ? (error as Error).message : erreur}</MessageErreur>}
      <ul className="flex flex-col gap-2">
        {jobs?.map((job) => (
          <li
            key={String(job.id)}
            className={cn('flex items-center gap-3 rounded-xl border border-border bg-card p-3', !job.actif && 'opacity-60')}
          >
            <button
              type="button"
              onClick={() => {
                setErreur(null)
                setEdition(job)
              }}
              className="min-w-0 flex-1 text-left"
            >
              <p className="truncate font-semibold">{job.nom}</p>
              <p className="truncate text-xs text-muted-foreground">
                {[EMPLOYEURS[job.employeur], job.client, job.adresse].filter(Boolean).join(' · ') || 'Toucher pour modifier'}
              </p>
            </button>
            <button
              type="button"
              disabled={envoi}
              onClick={() => sauver({ actif: !job.actif }, job.id)}
              className={cn(
                'h-11 shrink-0 rounded-lg px-3 text-sm font-semibold',
                job.actif ? 'bg-secondary text-foreground' : 'bg-success text-success-foreground',
              )}
            >
              {job.actif ? 'Désactiver' : 'Réactiver'}
            </button>
          </li>
        ))}
      </ul>

      <Feuille ouvert={edition !== null} onFermer={() => setEdition(null)} titre={edition?.id != null ? 'Modifier le job' : 'Nouveau job'}>
        {edition && (
          <form onSubmit={soumettre} className="flex flex-col gap-4">
            <Champ label="Employeur">
              <select className={classeChamp} value={edition.employeur ?? 'best'} onChange={e => setEdition({...edition, employeur:e.target.value as Employeur})}>
                {(Object.keys(EMPLOYEURS) as Employeur[]).map(k => <option key={k} value={k}>{EMPLOYEURS[k]}</option>)}
              </select>
            </Champ>
            <Champ label="Nom du job">
              <input required value={edition.nom ?? ''} onChange={(e) => setEdition({ ...edition, nom: e.target.value })} className={classeChamp} />
            </Champ>
            <Champ label="Client">
              <input value={edition.client ?? ''} onChange={(e) => setEdition({ ...edition, client: e.target.value })} className={classeChamp} />
            </Champ>
            <Champ label="Adresse">
              <input value={edition.adresse ?? ''} onChange={(e) => setEdition({ ...edition, adresse: e.target.value })} className={classeChamp} />
            </Champ>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={edition.actif ?? true}
                onChange={(e) => setEdition({ ...edition, actif: e.target.checked })}
                className="size-6 accent-[var(--primary)]"
              />
              <span className="font-medium">Job actif (visible pour les employés)</span>
            </label>
            {erreur && <MessageErreur>{erreur}</MessageErreur>}
            <BoutonPrincipal type="submit" chargement={envoi}>Enregistrer</BoutonPrincipal>
          </form>
        )}
      </Feuille>
    </div>
  )
}
