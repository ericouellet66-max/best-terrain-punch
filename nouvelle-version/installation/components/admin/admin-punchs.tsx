'use client'

import { MapPin, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import useSWR from 'swr'
import { useAuth } from '@/components/auth-provider'
import {
  BoutonPrincipal,
  BoutonSecondaire,
  Champ,
  Chargement,
  classeChamp,
  Feuille,
  MessageErreur,
} from '@/components/ui-terrain'
import { chargerPunchs, creerPunch, modifierPunch, nomEmploye, nomJob, supprimerPunch } from '@/lib/donnees'
import { rafraichirPunchs, useEmployes, useJobs } from '@/lib/hooks'
import { lienCarte } from '@/lib/gps'
import { LIBELLES_PUNCH } from '@/lib/punch'
import { ajouterJours, cleJour, debutJour, depuisDatetimeLocal, heure, libelleJour, versDatetimeLocal } from '@/lib/temps'
import { type Punch, type PunchType, TYPES_PUNCH } from '@/lib/types'

interface Brouillon {
  id?: Punch['id']
  employe_id: string
  job_id: string
  type: PunchType
  moment: string
  note: string
}

export function AdminPunchs() {
  const { session, employe: moi } = useAuth()
  const restreint = moi?.role === 'sous_admin'
  const { data: employes } = useEmployes()
  const { data: jobs } = useJobs(false)
  const aujourdhui = cleJour(new Date())
  const [entreprise, setEntreprise] = useState<'best' | 'ferme' | 'toutes'>('best')
  const [employeId, setEmployeId] = useState('')
  const [jobId, setJobId] = useState('')
  const [du, setDu] = useState(ajouterJours(aujourdhui, -6))
  const [au, setAu] = useState(aujourdhui)
  const [brouillon, setBrouillon] = useState<Brouillon | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)

  const { data: punchs, error, isLoading } = useSWR(['punchs-admin', entreprise, restreint, employeId, jobId, du, au], () =>
    chargerPunchs({
      employeur: restreint ? 'best' : entreprise === 'toutes' ? undefined : entreprise,
      employeId: employeId || undefined,
      jobId: jobId || undefined,
      depuis: debutJour(du),
      jusqua: debutJour(ajouterJours(au, 1)),
      ordre: 'desc',
    }),
  )

  const jobsVisibles = (jobs ?? []).filter(j => restreint ? j.employeur === 'best' : entreprise === 'toutes' || j.employeur === entreprise)

  function ouvrir(p?: Punch) {
    setErreur(null)
    setBrouillon(
      p
        ? {
            id: p.id,
            employe_id: String(p.employe_id),
            job_id: p.job_id != null ? String(p.job_id) : '',
            type: p.type,
            moment: versDatetimeLocal(p.horodatage),
            note: p.note ?? '',
          }
        : {
            employe_id: employeId,
            job_id: jobId,
            type: 'arrivee',
            moment: versDatetimeLocal(new Date()),
            note: '',
          },
    )
  }

  const trouver = <T extends { id: Punch['id'] }>(liste: T[] | undefined, id: string) =>
    liste?.find((x) => String(x.id) === id)?.id ?? null

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault()
    if (!brouillon) return
    const employe = trouver(employes, brouillon.employe_id)
    if (employe == null) return setErreur('Choisissez un employé.')
    if (!brouillon.moment) return setErreur('Indiquez la date et l’heure.')
    if (!brouillon.job_id) return setErreur('Choisissez un job pour identifier l’employeur.')
    setEnvoi(true)
    setErreur(null)
    try {
      const champs = {
        employe_id: employe,
        job_id: trouver(jobs, brouillon.job_id),
        type: brouillon.type,
        employeur: jobs?.find(j => String(j.id) === brouillon.job_id)?.employeur ?? 'best',
        horodatage: depuisDatetimeLocal(brouillon.moment).toISOString(),
        note: brouillon.note.trim() || null,
      }
      if (brouillon.id != null) {
        await modifierPunch(brouillon.id, {
          ...champs,
          modifie_le: new Date().toISOString(),
          modifie_par: session?.user.id ?? null,
        })
      } else {
        await creerPunch({ ...champs, note: champs.note ?? 'Ajout manuel (admin)' })
      }
      await rafraichirPunchs()
      setBrouillon(null)
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setEnvoi(false)
    }
  }

  async function supprimer() {
    if (brouillon?.id == null || !confirm('Supprimer définitivement ce punch?')) return
    setEnvoi(true)
    try {
      await supprimerPunch(brouillon.id)
      await rafraichirPunchs()
      setBrouillon(null)
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setEnvoi(false)
    }
  }

  const parJour = new Map<string, Punch[]>()
  for (const p of punchs ?? []) {
    const cle = cleJour(new Date(p.horodatage))
    parJour.set(cle, [...(parJour.get(cle) ?? []), p])
  }

  return (
    <div className="flex flex-col gap-4">
      {!restreint && <div className="grid grid-cols-3 gap-2" aria-label="Filtrer par entreprise">
        {([['best', 'B.E.S.T. Terrain'], ['ferme', 'Ferme'], ['toutes', 'Toutes']] as const).map(([valeur, titre]) => (
          <button key={valeur} type="button" onClick={() => { setEntreprise(valeur); setJobId('') }}
            aria-pressed={entreprise === valeur}
            className={`rounded-xl border-2 p-3 text-sm font-semibold ${entreprise === valeur ? 'border-primary bg-primary/15' : 'border-border'}`}>
            {titre}
          </button>
        ))}
      </div>}
      <div className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-card p-3">
        <Champ label="Employé">
          <select value={employeId} onChange={(e) => setEmployeId(e.target.value)} className={classeChamp}>
            <option value="">Tous</option>
            {employes?.map((e) => (
              <option key={String(e.id)} value={String(e.id)}>{e.nom}</option>
            ))}
          </select>
        </Champ>
        <Champ label="Job">
          <select value={jobId} onChange={(e) => setJobId(e.target.value)} className={classeChamp}>
            <option value="">Tous</option>
            {jobsVisibles.map((j) => (
              <option key={String(j.id)} value={String(j.id)}>{j.nom}</option>
            ))}
          </select>
        </Champ>
        <Champ label="Du">
          <input type="date" value={du} max={au} onChange={(e) => e.target.value && setDu(e.target.value)} className={classeChamp} />
        </Champ>
        <Champ label="Au">
          <input type="date" value={au} min={du} onChange={(e) => e.target.value && setAu(e.target.value)} className={classeChamp} />
        </Champ>
      </div>

      <BoutonPrincipal onClick={() => ouvrir()}>
        <Plus className="size-5" aria-hidden="true" />
        Ajouter un punch manquant
      </BoutonPrincipal>

      {error && <MessageErreur>{(error as Error).message}</MessageErreur>}
      {isLoading ? (
        <Chargement />
      ) : parJour.size === 0 ? (
        <p className="py-6 text-center text-muted-foreground">Aucun punch pour ces filtres.</p>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">{punchs?.length} punchs</p>
          {[...parJour.entries()].map(([jour, liste]) => (
            <section key={jour} className="rounded-2xl border border-border bg-card">
              <h3 className="border-b border-border px-4 py-2.5 font-semibold">{libelleJour(jour, true)}</h3>
              <ul className="divide-y divide-border">
                {liste.map((p) => (
                  <li key={String(p.id)}>
                    <button
                      type="button"
                      onClick={() => ouvrir(p)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-secondary"
                    >
                      <span className="w-12 font-semibold tabular-nums">{heure(p.horodatage)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{nomEmploye(employes, p.employe_id)}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {LIBELLES_PUNCH[p.type] ?? p.type} · {nomJob(jobs, p.job_id)}
                          {p.note && ` · ${p.note}`}
                        </span>
                      </span>
                      {p.latitude != null && p.longitude != null && (
                        <a href={lienCarte(p.latitude, p.longitude)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="rounded-lg p-2 text-primary" aria-label="Voir la position GPS sur la carte">
                          <MapPin className="size-4" aria-hidden="true" />
                        </a>
                      )}
                      {p.modifie_le && <span className="text-xs text-primary">corrigé</span>}
                      <Pencil className="size-4 text-muted-foreground" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Feuille
        ouvert={brouillon !== null}
        onFermer={() => setBrouillon(null)}
        titre={brouillon?.id != null ? 'Corriger le punch' : 'Ajouter un punch'}
      >
        {brouillon && (
          <form onSubmit={enregistrer} className="flex flex-col gap-4">
            <Champ label="Employé">
              <select
                required
                value={brouillon.employe_id}
                onChange={(e) => setBrouillon({ ...brouillon, employe_id: e.target.value })}
                className={classeChamp}
              >
                <option value="">Choisir…</option>
                {employes?.map((e) => (
                  <option key={String(e.id)} value={String(e.id)}>{e.nom}</option>
                ))}
              </select>
            </Champ>
            <Champ label="Type de punch">
              <select
                value={brouillon.type}
                onChange={(e) => setBrouillon({ ...brouillon, type: e.target.value as PunchType })}
                className={classeChamp}
              >
                {TYPES_PUNCH.map((t) => (
                  <option key={t} value={t}>{LIBELLES_PUNCH[t]}</option>
                ))}
              </select>
            </Champ>
            <Champ label="Job">
              <select
                value={brouillon.job_id}
                onChange={(e) => setBrouillon({ ...brouillon, job_id: e.target.value })}
                className={classeChamp}
              >
                <option value="">Aucun</option>
                {jobsVisibles.map((j) => (
                  <option key={String(j.id)} value={String(j.id)}>
                    {j.nom}
                    {!j.actif && ' (inactif)'}
                  </option>
                ))}
              </select>
            </Champ>
            <Champ label="Date et heure">
              <input
                type="datetime-local"
                required
                value={brouillon.moment}
                onChange={(e) => setBrouillon({ ...brouillon, moment: e.target.value })}
                className={classeChamp}
              />
            </Champ>
            <Champ label="Note (raison de la correction)">
              <input
                value={brouillon.note}
                onChange={(e) => setBrouillon({ ...brouillon, note: e.target.value })}
                className={classeChamp}
                placeholder="Ex. : oubli de punch"
              />
            </Champ>
            {erreur && <MessageErreur>{erreur}</MessageErreur>}
            <BoutonPrincipal type="submit" chargement={envoi}>Enregistrer</BoutonPrincipal>
            {brouillon.id != null && (
              <BoutonSecondaire type="button" onClick={supprimer} disabled={envoi} className="text-destructive">
                Supprimer ce punch
              </BoutonSecondaire>
            )}
          </form>
        )}
      </Feuille>
    </div>
  )
}
