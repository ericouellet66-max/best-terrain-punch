export type Id = string | number

export type Role = 'employe' | 'admin' | 'sous_admin'
export type Employeur = 'best' | 'ferme'
export const EMPLOYEURS: Record<Employeur, string> = { best: 'Entretien B.E.S.T. Terrain', ferme: 'Ferme Denis St-Pierre' }

export interface Employe {
  id: Id
  user_id: string | null
  nom: string | null
  courriel: string | null
  telephone: string | null
  role: Role
  actif: boolean
}

export interface Job {
  employeur: Employeur
  id: Id
  nom: string | null
  client: string | null
  adresse: string | null
  actif: boolean
}

export const TYPES_PUNCH = [
  'arrivee',
  'debut_diner',
  'fin_diner',
  'debut_souper',
  'fin_souper',
  'changement_job',
  'fin_journee',
] as const

export type PunchType = (typeof TYPES_PUNCH)[number]

export interface Punch {
  employeur: Employeur
  id: Id
  employe_id: Id
  job_id: Id | null
  type: PunchType
  horodatage: string
  note: string | null
  modifie_le: string | null
  modifie_par: string | null
  latitude: number | null
  longitude: number | null
  precision_gps: number | null
}

export type TypePhotoJob = 'debut' | 'fin'

export interface PhotoJob {
  note: string | null
  id: Id
  employe_id: Id
  job_id: Id
  type: TypePhotoJob
  chemin: string
  horodatage: string
  latitude: number | null
  longitude: number | null
  precision_gps: number | null
}

export interface NotificationAdmin {
  id: Id
  employe_id: Id | null
  job_id: Id | null
  titre: string
  message: string
  horodatage: string
  lue: boolean
}
