'use client'

import {
  ArrowLeftRight,
  CheckCircle2,
  Camera,
  Coffee,
  LogIn,
  LogOut,
  MapPin,
  Play,
  Square,
  UtensilsCrossed,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import { BoutonPrincipal, BoutonSecondaire, Chargement, Feuille, MessageErreur } from '@/components/ui-terrain'
import { creerPunch, enregistrerPhotoJob, nomJob } from '@/lib/donnees'
import { obtenirPositionGPS } from '@/lib/gps'
import { useEmployes, useJobs, usePunchsRecents } from '@/lib/hooks'
import {
  actionsPermises,
  calculerEtat,
  calculerSegments,
  LIBELLES_ETAT,
  LIBELLES_PUNCH,
  raisonRefus,
  totalSegments,
  type Etat,
} from '@/lib/punch'
import { dateLongue, duree, heure } from '@/lib/temps'
import { EMPLOYEURS, type Employeur, type Id, type Job, type PunchType } from '@/lib/types'
import { cn } from '@/lib/utils'

const COULEUR_ETAT: Record<Etat, string> = {
  non_punche: 'bg-muted-foreground',
  au_travail: 'bg-success',
  diner: 'bg-primary',
  souper: 'bg-primary',
}

function Horloge() {
  const [maintenant, setMaintenant] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setMaintenant(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <div>
      <p className="text-sm text-muted-foreground">{dateLongue(maintenant)}</p>
      <p className="font-display text-5xl font-bold tabular-nums leading-tight">{heure(maintenant)}</p>
    </div>
  )
}

function ListeJobs({
  jobs,
  selection,
  onChoisir,
  exclure,
}: {
  jobs: Job[]
  selection: string
  onChoisir: (id: string) => void
  exclure?: Id | null
}) {
  const visibles = jobs.filter((j) => String(j.id) !== String(exclure ?? ''))
  if (visibles.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun job actif. Demandez à un administrateur d’en créer un.</p>
  }
  return (
    <div role="radiogroup" aria-label="Sur quel job?" className="flex max-h-72 flex-col gap-2 overflow-y-auto">
      {visibles.map((job) => {
        const choisi = selection === String(job.id)
        return (
          <button
            key={String(job.id)}
            type="button"
            role="radio"
            aria-checked={choisi}
            onClick={() => onChoisir(String(job.id))}
            className={cn(
              'flex min-h-14 items-center gap-3 rounded-xl border-2 px-4 py-2 text-left transition',
              choisi ? 'border-primary bg-primary/15' : 'border-border bg-secondary',
            )}
          >
            <MapPin className={cn('size-5 shrink-0', choisi ? 'text-primary' : 'text-muted-foreground')} aria-hidden="true" />
            <span className="flex flex-col">
              <span className="text-base font-semibold">{job.nom}</span>
              {(job.client || job.adresse) && (
                <span className="text-xs text-muted-foreground">
                  {[job.client, job.adresse].filter(Boolean).join(' · ')}
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function BoutonPunch({
  libelle,
  icone: Icone,
  actif,
  occupe,
  variante = 'normal',
  onClick,
  className,
}: {
  libelle: string
  icone: React.ComponentType<{ className?: string }>
  actif: boolean
  occupe: boolean
  variante?: 'primaire' | 'normal' | 'fin'
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      disabled={!actif || occupe}
      onClick={onClick}
      className={cn(
        'flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-3 font-display text-lg font-bold uppercase leading-tight tracking-wide transition active:scale-[0.97] disabled:opacity-30 sm:text-xl',
        variante === 'primaire' && 'bg-primary text-primary-foreground',
        variante === 'normal' && 'border-2 border-border bg-secondary text-foreground enabled:border-primary/60',
        variante === 'fin' && 'bg-destructive text-destructive-foreground',
        className,
      )}
    >
      <Icone className="size-7" aria-hidden="true" />
      {libelle}
    </button>
  )
}

interface Confirmation {
  type: PunchType
  moment: Date
  job: string
}

function ConfirmationPunch({ confirmation, onFermer }: { confirmation: Confirmation; onFermer: () => void }) {
  useEffect(() => {
    const t = setTimeout(onFermer, 5000)
    return () => clearTimeout(t)
  }, [onFermer])
  return (
    <button
      type="button"
      onClick={onFermer}
      role="alertdialog"
      aria-live="assertive"
      aria-label="Punch enregistré. Toucher pour fermer."
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-success p-6 text-center text-success-foreground"
    >
      <CheckCircle2 className="size-24" aria-hidden="true" />
      <p className="font-display text-3xl font-extrabold uppercase">{LIBELLES_PUNCH[confirmation.type]}</p>
      <p className="font-display text-7xl font-extrabold tabular-nums">{heure(confirmation.moment)}</p>
      <p className="text-lg font-semibold">{confirmation.job}</p>
      <p className="mt-6 text-sm font-medium opacity-80">Punch enregistré — toucher pour fermer</p>
    </button>
  )
}

export function EcranPunch() {
  const { employe, estAdmin, session } = useAuth()
  const { data: employes } = useEmployes()
  const [employeSelectionne, setEmployeSelectionne] = useState('')
  const personne = estAdmin && employeSelectionne
    ? employes?.find(e => String(e.id) === employeSelectionne) ?? employe
    : employe
  const { data: punchs, error, isLoading, mutate } = usePunchsRecents(personne?.id)
  const { data: jobs } = useJobs(true)
  const { data: tousJobs } = useJobs(false)

  const [employeur, setEmployeur] = useState<Employeur>('best')
  const [notePhoto, setNotePhoto] = useState('')
  const [photoChoisie, setPhotoChoisie] = useState<{type:'debut'|'fin';fichier:File}|null>(null)
  const [jobArrivee, setJobArrivee] = useState('')
  const [nouveauJob, setNouveauJob] = useState('')
  const [feuilleJob, setFeuilleJob] = useState(false)
  const [feuilleFin, setFeuilleFin] = useState(false)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [occupe, setOccupe] = useState(false)
  const [photoEnvoi, setPhotoEnvoi] = useState<'debut' | 'fin' | null>(null)

  const employeurActif = useMemo(() => {
    const dernier = [...(punchs ?? [])].sort((a,b) => a.horodatage.localeCompare(b.horodatage)).at(-1)
    return dernier && calculerEtat((punchs ?? []).filter(p => p.employeur === dernier.employeur)).etat !== 'non_punche' ? dernier.employeur : null
  }, [punchs])
  const employeurSelectionne = employeurActif ?? employeur
  const punchsEmployeur = useMemo(() => (punchs ?? []).filter(p => p.employeur === employeurSelectionne), [punchs, employeurSelectionne])
  const jobsEmployeur = useMemo(() => (jobs ?? []).filter(j => j.employeur === employeurSelectionne), [jobs, employeurSelectionne])
  const etat = useMemo(() => calculerEtat(punchsEmployeur), [punchsEmployeur])
  const permises = actionsPermises(etat)
  const heuresAujourdhui = useMemo(
    () => totalSegments(calculerSegments(punchsEmployeur).filter((s) => etat.debutQuart && s.debut >= etat.debutQuart)),
    [punchsEmployeur, etat.debutQuart],
  )

  if (!employe) return null
  if (isLoading) return <Chargement />

  const trouverJob = (id: string) => jobsEmployeur.find((j) => String(j.id) === id)?.id ?? null

  async function punch(type: PunchType, jobChoisi?: Id | null) {
    if (!personne || occupe) return
    setOccupe(true)
    setErreur(null)
    try {
      const frais = await mutate()
      const etatFrais = calculerEtat((frais ?? []).filter(p => p.employeur === employeurSelectionne))
      if (!actionsPermises(etatFrais)[type]) throw new Error(raisonRefus(type, etatFrais))
      const job = jobChoisi ?? etatFrais.jobId
      if (job == null) throw new Error('Choisissez d’abord sur quel job vous travaillez.')

      const gps = await obtenirPositionGPS()
      const enregistre = await creerPunch({
        employe_id: personne.id, job_id: job, type, employeur: employeurSelectionne,
        note: estAdmin && String(personne.id) !== String(employe?.id) ? `Punch effectué par administrateur ${employe?.nom ?? session?.user.email ?? ""}` : null,
        latitude: gps.latitude, longitude: gps.longitude, precision_gps: gps.precision,
      })
      await mutate()
      navigator.vibrate?.(150)
      setConfirmation({ type, moment: new Date(enregistre.horodatage), job: nomJob(tousJobs ?? jobs, job) })
      setJobArrivee('')
      setNouveauJob('')
      setFeuilleJob(false)
      setFeuilleFin(false)
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setOccupe(false)
    }
  }

  async function photoJob(type: 'debut' | 'fin', fichier?: File) {
    if (!personne || !fichier || etat.jobId == null || photoEnvoi) return
    setPhotoEnvoi(type)
    setErreur(null)
    try {
      const gps = await obtenirPositionGPS()
      await enregistrerPhotoJob({
        employe_id: personne.id,
        job_id: etat.jobId,
        type,
        fichier,
        note: notePhoto,
        latitude: gps.latitude,
        longitude: gps.longitude,
        precision_gps: gps.precision,
      })
      setPhotoChoisie(null)
      setNotePhoto('')
      navigator.vibrate?.(150)
      alert(`Photo ${type === 'debut' ? 'de début' : 'de fin'} enregistrée.`)
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Impossible d’enregistrer la photo.')
    } finally {
      setPhotoEnvoi(null)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <section aria-labelledby="salutation">
        <h1 id="salutation" className="font-display text-3xl font-bold">
          Bonjour, <span className="text-primary">{personne?.nom?.split(' ')[0] ?? 'employé'}</span>
        </h1>
        <Horloge />
      </section>

      {estAdmin && (
        <section className="rounded-2xl border border-primary/50 bg-card p-4">
          <label htmlFor="admin-employe-punch" className="mb-2 block font-bold">Qui veux-tu puncher ?</label>
          <select id="admin-employe-punch" value={employeSelectionne}
            onChange={e => { setEmployeSelectionne(e.target.value); setJobArrivee(''); setNouveauJob(''); setErreur(null) }}
            className="min-h-14 w-full rounded-xl border border-border bg-secondary px-3 text-lg font-semibold">
            <option value="">Moi-même ({employe.nom})</option>
            {(employes ?? []).filter(e => e.actif && String(e.id) !== String(employe.id)).map(e =>
              <option key={String(e.id)} value={String(e.id)}>{e.nom}</option>)}
          </select>
          <p className="mt-2 text-xs text-muted-foreground">Tu peux puncher un employé sans ouvrir son compte. Le punch garde une note indiquant l'administrateur.</p>
        </section>
      )}
      <section className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-2 text-sm font-semibold">Employeur</p>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(EMPLOYEURS) as Employeur[]).map(e => <button key={e} type="button" disabled={employeurActif !== null && employeurActif !== e}
            onClick={() => { setEmployeur(e); setJobArrivee(''); setNouveauJob('') }}
            className={cn('min-h-16 rounded-xl border-2 p-2 text-sm font-bold', employeurSelectionne === e ? 'border-primary bg-primary/15' : 'border-border', employeurActif && employeurActif !== e && 'opacity-40')}>
            {EMPLOYEURS[e]}
          </button>)}
        </div>
        {employeurActif && <p className="mt-2 text-xs text-muted-foreground">Terminez votre quart avant de changer d’employeur.</p>}
      </section>
      <section aria-label="État actuel" className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={cn('size-4 rounded-full', COULEUR_ETAT[etat.etat])} aria-hidden="true" />
            <p className="font-display text-2xl font-bold uppercase">{LIBELLES_ETAT[etat.etat]}</p>
          </div>
          {etat.depuis && etat.etat !== 'non_punche' && (
            <p className="text-sm text-muted-foreground">depuis {heure(etat.depuis)}</p>
          )}
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Job actuel</dt>
            <dd className="font-semibold">{etat.jobId != null ? nomJob(tousJobs ?? jobs, etat.jobId) : 'Aucun'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Heures aujourd’hui</dt>
            <dd className="font-semibold tabular-nums">{duree(heuresAujourdhui)}</dd>
          </div>
        </dl>
      </section>

      {error && <MessageErreur>Impossible de charger vos punchs : {(error as Error).message}</MessageErreur>}
      {erreur && <MessageErreur>{erreur}</MessageErreur>}

      {etat.etat === 'non_punche' && (
        <section aria-labelledby="titre-job" className="flex flex-col gap-3 rounded-2xl border border-primary/50 bg-card p-4">
          <h2 id="titre-job" className="font-display text-2xl font-bold uppercase">Sur quel job?</h2>
          {jobs ? <ListeJobs jobs={jobsEmployeur} selection={jobArrivee} onChoisir={setJobArrivee} /> : <Chargement />}
        </section>
      )}

      <section aria-label="Actions de punch" className="grid grid-cols-2 gap-3">
        <BoutonPunch
          libelle="Punch arrivée"
          icone={LogIn}
          variante="primaire"
          className="col-span-2 min-h-24 text-2xl"
          actif={permises.arrivee && jobArrivee !== ''}
          occupe={occupe}
          onClick={() => punch('arrivee', trouverJob(jobArrivee))}
        />
        <BoutonPunch libelle="Début dîner" icone={UtensilsCrossed} actif={permises.debut_diner} occupe={occupe} onClick={() => punch('debut_diner')} />
        <BoutonPunch libelle="Fin dîner" icone={Play} actif={permises.fin_diner} occupe={occupe} onClick={() => punch('fin_diner')} />
        <BoutonPunch libelle="Début souper" icone={Coffee} actif={permises.debut_souper} occupe={occupe} onClick={() => punch('debut_souper')} />
        <BoutonPunch libelle="Fin souper" icone={Play} actif={permises.fin_souper} occupe={occupe} onClick={() => punch('fin_souper')} />
        <BoutonPunch
          libelle="Changer de job"
          icone={ArrowLeftRight}
          className="col-span-2"
          actif={permises.changement_job}
          occupe={occupe}
          onClick={() => {
            setErreur(null)
            setFeuilleJob(true)
          }}
        />
        <BoutonPunch
          libelle="Fin de journée"
          icone={LogOut}
          variante="fin"
          className="col-span-2"
          actif={permises.fin_journee}
          occupe={occupe}
          onClick={() => {
            setErreur(null)
            setFeuilleFin(true)
          }}
        />
      </section>

      {etat.etat === 'non_punche' && jobArrivee === '' && (
        <p className="text-center text-sm text-muted-foreground">Choisissez un job pour activer PUNCH ARRIVÉE.</p>
      )}

      {etat.etat !== 'non_punche' && etat.jobId != null && (
        <section className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-card p-4" aria-label="Photos du job">
          <label className="flex min-h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-primary/60 bg-secondary px-2 text-center font-display font-bold uppercase">
            <Camera className="size-6" aria-hidden="true" />
            {photoEnvoi === 'debut' ? 'Envoi…' : 'Photo début'}
            <input type="file" accept="image/*" capture="environment" className="sr-only" disabled={photoEnvoi !== null} onChange={(e) => {const fichier=e.target.files?.[0];if(fichier)setPhotoChoisie({type:'debut',fichier});e.target.value=''}} />
          </label>
          <label className="flex min-h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-primary/60 bg-secondary px-2 text-center font-display font-bold uppercase">
            <Camera className="size-6" aria-hidden="true" />
            {photoEnvoi === 'fin' ? 'Envoi…' : 'Photo fin'}
            <input type="file" accept="image/*" capture="environment" className="sr-only" disabled={photoEnvoi !== null} onChange={(e) => {const fichier=e.target.files?.[0];if(fichier)setPhotoChoisie({type:'fin',fichier});e.target.value=''}} />
          </label>
          <p className="col-span-2 text-center text-xs text-muted-foreground">La photo enregistre aussi l’heure et la position GPS.</p>
        </section>
      )}

      <Feuille ouvert={photoChoisie !== null} onFermer={() => {setPhotoChoisie(null);setNotePhoto('')}} titre="Photo et note">
        <div className="flex flex-col gap-4">
          <p className="text-sm">{photoChoisie?.fichier.name}</p>
          <label className="font-semibold" htmlFor="note-photo">Note (facultative)</label>
          <textarea id="note-photo" value={notePhoto} onChange={e=>setNotePhoto(e.target.value)} rows={3} maxLength={2000}
            placeholder="Ex. : Terrain humide, revenir demain…" className="w-full rounded-xl border border-border bg-secondary p-3" />
          {erreur && <MessageErreur>{erreur}</MessageErreur>}
          <BoutonPrincipal disabled={photoEnvoi !== null} onClick={() => {if(photoChoisie) void photoJob(photoChoisie.type,photoChoisie.fichier)}}>Enregistrer la photo</BoutonPrincipal>
          <BoutonSecondaire onClick={() => {setPhotoChoisie(null);setNotePhoto('')}}>Annuler</BoutonSecondaire>
        </div>
      </Feuille>
      <Feuille ouvert={feuilleJob} onFermer={() => setFeuilleJob(false)} titre="Nouveau job">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Job actuel : <span className="font-semibold text-foreground">{nomJob(tousJobs ?? jobs, etat.jobId)}</span>
          </p>
          {jobs && <ListeJobs jobs={jobsEmployeur} selection={nouveauJob} onChoisir={setNouveauJob} exclure={etat.jobId} />}
          {erreur && <MessageErreur>{erreur}</MessageErreur>}
          <BoutonPrincipal
            className="h-16"
            disabled={nouveauJob === ''}
            chargement={occupe}
            onClick={() => punch('changement_job', trouverJob(nouveauJob))}
          >
            Confirmer le changement
          </BoutonPrincipal>
        </div>
      </Feuille>

      <Feuille ouvert={feuilleFin} onFermer={() => setFeuilleFin(false)} titre="Fin de journée?">
        <div className="flex flex-col gap-4">
          <p className="text-base">
            Vous avez travaillé <span className="font-bold text-primary">{duree(heuresAujourdhui)}</span> aujourd’hui.
            Confirmer la fin de votre journée?
          </p>
          {erreur && <MessageErreur>{erreur}</MessageErreur>}
          <BoutonPrincipal className="h-16 bg-destructive text-destructive-foreground" chargement={occupe} onClick={() => punch('fin_journee')}>
            {!occupe && <Square className="size-5" aria-hidden="true" />}
            Oui, terminer
          </BoutonPrincipal>
          <BoutonSecondaire onClick={() => setFeuilleFin(false)}>Annuler</BoutonSecondaire>
        </div>
      </Feuille>

      {confirmation && <ConfirmationPunch confirmation={confirmation} onFermer={() => setConfirmation(null)} />}
    </div>
  )
}
