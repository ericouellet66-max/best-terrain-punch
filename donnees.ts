import { getSupabase } from './supabase'
import type { Employe, Id, Job, NotificationAdmin, PhotoJob, Punch, PunchType, TypePhotoJob } from './types'

function verifier<T>(resultat: { data: T | null; error: { message: string } | null }): T {
  if (resultat.error) throw new Error(resultat.error.message)
  return resultat.data as T
}

export interface FiltresPunchs {
  employeId?: Id
  jobId?: Id
  depuis?: Date
  jusqua?: Date
  ordre?: 'asc' | 'desc'
  limite?: number
}

export async function chargerPunchs(f: FiltresPunchs = {}) {
  let q = getSupabase()
    .from('punchs')
    .select('*')
    .order('horodatage', { ascending: (f.ordre ?? 'asc') === 'asc' })
    .limit(f.limite ?? 3000)
  if (f.employeId != null && f.employeId !== '') q = q.eq('employe_id', f.employeId)
  if (f.jobId != null && f.jobId !== '') q = q.eq('job_id', f.jobId)
  if (f.depuis) q = q.gte('horodatage', f.depuis.toISOString())
  if (f.jusqua) q = q.lt('horodatage', f.jusqua.toISOString())
  return verifier<Punch[]>(await q)
}

export async function chargerJobs(actifsSeulement = false) {
  let q = getSupabase().from('jobs').select('*').order('nom', { ascending: true })
  if (actifsSeulement) q = q.eq('actif', true)
  return verifier<Job[]>(await q)
}

export async function chargerEmployes() {
  return verifier<Employe[]>(
    await getSupabase().from('employes').select('*').order('nom', { ascending: true }),
  )
}

export async function creerPunch(p: {
  employe_id: Id
  job_id: Id | null
  type: PunchType
  horodatage?: string
  note?: string | null
  latitude?: number | null
  longitude?: number | null
  precision_gps?: number | null
}) {
  return verifier<Punch>(await getSupabase().from('punchs').insert(p).select().single())
}

export async function modifierPunch(id: Id, champs: Partial<Omit<Punch, 'id'>>) {
  return verifier<Punch>(
    await getSupabase().from('punchs').update(champs).eq('id', id).select().single(),
  )
}

export async function supprimerPunch(id: Id) {
  const { error } = await getSupabase().from('punchs').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function enregistrerJob(champs: Partial<Omit<Job, 'id'>>, id?: Id) {
  const table = getSupabase().from('jobs')
  const requete = id != null ? table.update(champs).eq('id', id) : table.insert(champs)
  return verifier<Job>(await requete.select().single())
}

export async function enregistrerEmploye(champs: Partial<Omit<Employe, 'id'>>, id?: Id) {
  const table = getSupabase().from('employes')
  const requete = id != null ? table.update(champs).eq('id', id) : table.insert(champs)
  return verifier<Employe>(await requete.select().single())
}

export function nomJob(jobs: Job[] | undefined, id: Id | null | undefined) {
  if (id == null) return '—'
  return jobs?.find((j) => String(j.id) === String(id))?.nom ?? 'Job inconnu'
}

export function nomEmploye(employes: Employe[] | undefined, id: Id | null | undefined) {
  if (id == null) return '—'
  return employes?.find((e) => String(e.id) === String(id))?.nom ?? 'Employé inconnu'
}


export async function enregistrerPhotoJob(p: {
  employe_id: Id
  job_id: Id
  type: TypePhotoJob
  fichier: File
  latitude?: number | null
  longitude?: number | null
  precision_gps?: number | null
}) {
  const supabase = getSupabase()
  const extension = p.fichier.name.split('.').pop()?.toLowerCase() || 'jpg'
  const chemin = `${p.job_id}/${p.employe_id}/${Date.now()}-${p.type}.${extension}`
  const { error: erreurUpload } = await supabase.storage.from('photos-jobs').upload(chemin, p.fichier, {
    cacheControl: '3600',
    upsert: false,
  })
  if (erreurUpload) throw new Error(erreurUpload.message)
  return verifier<PhotoJob>(await supabase.from('photos_jobs').insert({
    employe_id: p.employe_id,
    job_id: p.job_id,
    type: p.type,
    chemin,
    latitude: p.latitude ?? null,
    longitude: p.longitude ?? null,
    precision_gps: p.precision_gps ?? null,
  }).select().single())
}

export async function chargerPhotosJob(jobId?: Id) {
  let q = getSupabase().from('photos_jobs').select('*').order('horodatage', { ascending: false }).limit(500)
  if (jobId != null && jobId !== '') q = q.eq('job_id', jobId)
  return verifier<PhotoJob[]>(await q)
}

export async function urlPhotoJob(chemin: string) {
  const { data, error } = await getSupabase().storage.from('photos-jobs').createSignedUrl(chemin, 3600)
  if (error) throw new Error(error.message)
  return data.signedUrl
}

export async function chargerNotificationsAdmin() {
  return verifier<NotificationAdmin[]>(await getSupabase().from('notifications_admin').select('*').order('horodatage', { ascending: false }).limit(100))
}

export async function marquerNotificationLue(id: Id) {
  return verifier<NotificationAdmin>(await getSupabase().from('notifications_admin').update({ lue: true }).eq('id', id).select().single())
}
