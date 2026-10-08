export interface PrefsRappels {
  actif: boolean
  matinActif: boolean
  matin: string
  finJourneeActif: boolean
  finJournee: string
  dinerActif: boolean
  diner: string
  souperActif: boolean
  souper: string
}

export const PREFS_DEFAUT: PrefsRappels = {
  actif: false,
  matinActif: true,
  matin: '07:00',
  finJourneeActif: true,
  finJournee: '17:00',
  dinerActif: true,
  diner: '12:00',
  souperActif: false,
  souper: '18:00',
}

const CLE_PREFS = 'best-punch:rappels'

export function lirePrefs(): PrefsRappels {
  try {
    const brut = localStorage.getItem(CLE_PREFS)
    return brut ? { ...PREFS_DEFAUT, ...JSON.parse(brut) } : PREFS_DEFAUT
  } catch {
    return PREFS_DEFAUT
  }
}

export function ecrirePrefs(prefs: PrefsRappels) {
  localStorage.setItem(CLE_PREFS, JSON.stringify(prefs))
}

export function dejaEnvoye(cle: string) {
  return localStorage.getItem(`best-punch:rappel:${cle}`) === '1'
}

export function marquerEnvoye(cle: string) {
  localStorage.setItem(`best-punch:rappel:${cle}`, '1')
}

export function notificationsSupportees() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export async function afficherNotification(titre: string, corps: string, tag?: string) {
  if (!notificationsSupportees() || Notification.permission !== 'granted') return false
  const options: NotificationOptions = {
    body: corps,
    icon: '/icons/icon.png',
    badge: '/icons/icon.png',
    tag,
  }
  const registration = await navigator.serviceWorker?.getRegistration()
  if (registration) {
    await registration.showNotification(titre, options)
  } else {
    new Notification(titre, options)
  }
  return true
}

/** Minutes écoulées depuis l'heure cible "HH:MM" (négatif si pas encore atteinte). */
export function minutesDepuis(cible: string, actuelle: string) {
  const [hc, mc] = cible.split(':').map(Number)
  const [ha, ma] = actuelle.split(':').map(Number)
  return ha * 60 + ma - (hc * 60 + mc)
}
