export const FUSEAU = 'America/Toronto'

const formatJour = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSEAU,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const formatHeure = new Intl.DateTimeFormat('fr-CA', {
  timeZone: FUSEAU,
  hour: '2-digit',
  minute: '2-digit',
})

const formatDateLongue = new Intl.DateTimeFormat('fr-CA', {
  timeZone: FUSEAU,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/** Clé de journée YYYY-MM-DD dans le fuseau du Québec. */
export function cleJour(date: Date) {
  return formatJour.format(date)
}

export function heure(date: Date | string) {
  return formatHeure.format(typeof date === 'string' ? new Date(date) : date)
}

export function dateLongue(date: Date) {
  const texte = formatDateLongue.format(date)
  return texte.charAt(0).toUpperCase() + texte.slice(1)
}

function versUTC(cle: string) {
  const [a, m, j] = cle.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, j))
}

export function ajouterJours(cle: string, jours: number) {
  const d = versUTC(cle)
  d.setUTCDate(d.getUTCDate() + jours)
  return d.toISOString().slice(0, 10)
}

/** Dimanche (YYYY-MM-DD) de la semaine contenant la journée donnée. */
export function cleSemaine(cle: string) {
  const d = versUTC(cle)
  return ajouterJours(cle, -d.getUTCDay())
}

export function joursDeSemaine(cleDimanche: string) {
  return Array.from({ length: 7 }, (_, i) => ajouterJours(cleDimanche, i))
}

const formatLibelleJour = new Intl.DateTimeFormat('fr-CA', {
  timeZone: 'UTC',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

const formatLibelleJourLong = new Intl.DateTimeFormat('fr-CA', {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

export function libelleJour(cle: string, long = false) {
  const d = versUTC(cle)
  d.setUTCHours(12)
  const texte = (long ? formatLibelleJourLong : formatLibelleJour).format(d)
  return texte.charAt(0).toUpperCase() + texte.slice(1)
}

export function duree(ms: number) {
  const minutes = Math.max(0, Math.round(ms / 60000))
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`
}

export function heuresDecimales(ms: number) {
  return (ms / 3_600_000).toFixed(2)
}

function decalageMinutes(date: Date) {
  const partie = new Intl.DateTimeFormat('en-US', { timeZone: FUSEAU, timeZoneName: 'shortOffset' })
    .formatToParts(date)
    .find((p) => p.type === 'timeZoneName')?.value
  const m = partie?.match(/GMT([+-]\d+)(?::(\d+))?/)
  if (!m) return 0
  const h = Number(m[1])
  const min = Number(m[2] ?? 0)
  return h * 60 + Math.sign(h) * min
}

/** Instant correspondant à une date/heure murale au Québec. */
function instantLocal(a: number, mo: number, j: number, h = 0, mi = 0) {
  const naif = Date.UTC(a, mo - 1, j, h, mi)
  const decalage = decalageMinutes(new Date(naif))
  return new Date(naif - decalage * 60000)
}

export function debutJour(cle: string) {
  const [a, m, j] = cle.split('-').map(Number)
  return instantLocal(a, m, j)
}

/** ISO -> valeur pour <input type="datetime-local"> en heure du Québec. */
export function versDatetimeLocal(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date
  const parties = new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSEAU,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d)
  const v = (t: string) => parties.find((p) => p.type === t)?.value ?? '00'
  return `${v('year')}-${v('month')}-${v('day')}T${v('hour')}:${v('minute')}`
}

export function depuisDatetimeLocal(valeur: string) {
  const [date, temps] = valeur.split('T')
  const [a, m, j] = date.split('-').map(Number)
  const [h, mi] = (temps ?? '00:00').split(':').map(Number)
  return instantLocal(a, m, j, h, mi)
}

/** Heure murale actuelle "HH:MM" au Québec. */
export function heureMuraleHM(date = new Date()) {
  return versDatetimeLocal(date).split('T')[1]
}
