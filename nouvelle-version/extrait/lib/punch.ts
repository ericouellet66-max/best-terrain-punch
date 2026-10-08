import { cleJour } from './temps'
import type { Id, Punch, PunchType } from './types'

export const LIBELLES_PUNCH: Record<PunchType, string> = {
  arrivee: 'Punch arrivée',
  debut_diner: 'Début dîner',
  fin_diner: 'Fin dîner',
  debut_souper: 'Début souper',
  fin_souper: 'Fin souper',
  changement_job: 'Changement de job',
  fin_journee: 'Fin de journée',
}

export type Etat = 'non_punche' | 'au_travail' | 'diner' | 'souper'

export const LIBELLES_ETAT: Record<Etat, string> = {
  non_punche: 'Non punché',
  au_travail: 'Au travail',
  diner: 'Dîner',
  souper: 'Souper',
}

/** Un quart sans punch depuis plus longtemps est considéré comme oublié. */
const DELAI_OUBLI_MS = 18 * 3600 * 1000

export interface EtatEmploye {
  etat: Etat
  jobId: Id | null
  depuis: Date | null
  debutQuart: Date | null
  dinerFait: boolean
  souperFait: boolean
  dernierPunch: Punch | null
}

const temps = (p: Punch) => new Date(p.horodatage)

export function trierPunchs(punchs: Punch[]) {
  return [...punchs].sort((a, b) => temps(a).getTime() - temps(b).getTime())
}

export function calculerEtat(punchs: Punch[], maintenant = new Date()): EtatEmploye {
  const tries = trierPunchs(punchs)
  const dernier = tries.at(-1) ?? null
  const base: EtatEmploye = {
    etat: 'non_punche',
    jobId: null,
    depuis: null,
    debutQuart: null,
    dinerFait: false,
    souperFait: false,
    dernierPunch: dernier,
  }

  if (!dernier || dernier.type === 'fin_journee') return base
  if (maintenant.getTime() - temps(dernier).getTime() > DELAI_OUBLI_MS) return base

  let indexArrivee = -1
  for (let i = tries.length - 1; i >= 0; i--) {
    if (tries[i].type === 'fin_journee') break
    if (tries[i].type === 'arrivee') {
      indexArrivee = i
      break
    }
  }
  if (indexArrivee < 0) return base

  const resultat: EtatEmploye = { ...base, debutQuart: temps(tries[indexArrivee]) }
  for (const p of tries.slice(indexArrivee)) {
    resultat.depuis = temps(p)
    switch (p.type) {
      case 'arrivee':
        resultat.etat = 'au_travail'
        resultat.jobId = p.job_id
        break
      case 'changement_job':
        resultat.etat = 'au_travail'
        resultat.jobId = p.job_id ?? resultat.jobId
        break
      case 'debut_diner':
        resultat.etat = 'diner'
        resultat.dinerFait = true
        break
      case 'debut_souper':
        resultat.etat = 'souper'
        resultat.souperFait = true
        break
      case 'fin_diner':
      case 'fin_souper':
        resultat.etat = 'au_travail'
        break
    }
  }
  return resultat
}

export function actionsPermises(e: EtatEmploye): Record<PunchType, boolean> {
  return {
    arrivee: e.etat === 'non_punche',
    debut_diner: e.etat === 'au_travail' && !e.dinerFait,
    fin_diner: e.etat === 'diner',
    debut_souper: e.etat === 'au_travail' && !e.souperFait,
    fin_souper: e.etat === 'souper',
    changement_job: e.etat === 'au_travail',
    fin_journee: e.etat === 'au_travail',
  }
}

export function raisonRefus(type: PunchType, e: EtatEmploye) {
  if (e.etat === 'non_punche' && type !== 'arrivee') return 'Vous devez d’abord faire PUNCH ARRIVÉE.'
  if (type === 'arrivee') return 'Vous êtes déjà punché. Terminez votre journée avant un nouveau punch d’arrivée.'
  if (e.etat === 'diner') return 'Vous êtes en dîner. Faites FIN DÎNER d’abord.'
  if (e.etat === 'souper') return 'Vous êtes en souper. Faites FIN SOUPER d’abord.'
  if (type === 'fin_diner') return 'Aucun dîner en cours.'
  if (type === 'fin_souper') return 'Aucun souper en cours.'
  if (type === 'debut_diner') return 'Le dîner a déjà été pris aujourd’hui.'
  if (type === 'debut_souper') return 'Le souper a déjà été pris aujourd’hui.'
  return 'Action impossible pour le moment.'
}

export interface Segment {
  debut: Date
  fin: Date
  jobId: Id | null
  enCours: boolean
}

/** Périodes réellement travaillées (pauses repas exclues) pour un seul employé. */
export function calculerSegments(punchs: Punch[], maintenant = new Date()): Segment[] {
  const segments: Segment[] = []
  let ouvert: { debut: Date; jobId: Id | null } | null = null
  let enQuart = false
  let jobId: Id | null = null

  const fermer = (fin: Date) => {
    if (ouvert && fin > ouvert.debut) segments.push({ ...ouvert, fin, enCours: false })
    ouvert = null
  }

  for (const p of trierPunchs(punchs)) {
    const t = temps(p)
    switch (p.type) {
      case 'arrivee':
        ouvert = null
        enQuart = true
        jobId = p.job_id
        ouvert = { debut: t, jobId }
        break
      case 'changement_job': {
        const travaillait = ouvert !== null
        fermer(t)
        jobId = p.job_id ?? jobId
        if (travaillait || enQuart) ouvert = { debut: t, jobId }
        break
      }
      case 'debut_diner':
      case 'debut_souper':
        fermer(t)
        break
      case 'fin_diner':
      case 'fin_souper':
        if (enQuart && !ouvert) ouvert = { debut: t, jobId }
        break
      case 'fin_journee':
        fermer(t)
        enQuart = false
        break
    }
  }

  const dernierOuvert = ouvert as { debut: Date; jobId: Id | null } | null
  if (dernierOuvert && maintenant.getTime() - dernierOuvert.debut.getTime() < DELAI_OUBLI_MS) {
    segments.push({ ...dernierOuvert, fin: maintenant, enCours: true })
  }
  return segments
}

export function totauxParJour(segments: Segment[]) {
  const totaux = new Map<string, number>()
  for (const s of segments) {
    const cle = cleJour(s.debut)
    totaux.set(cle, (totaux.get(cle) ?? 0) + (s.fin.getTime() - s.debut.getTime()))
  }
  return totaux
}

export function totalSegments(segments: Segment[]) {
  return segments.reduce((t, s) => t + (s.fin.getTime() - s.debut.getTime()), 0)
}

export function grouperParEmploye(punchs: Punch[]) {
  const groupes = new Map<string, Punch[]>()
  for (const p of punchs) {
    const cle = String(p.employe_id)
    const liste = groupes.get(cle) ?? []
    liste.push(p)
    groupes.set(cle, liste)
  }
  return groupes
}
