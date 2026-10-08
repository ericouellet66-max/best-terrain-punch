'use client'

import useSWR, { mutate as mutateGlobal } from 'swr'
import { chargerEmployes, chargerJobs, chargerPunchs } from './donnees'
import type { Id } from './types'

export function usePunchsRecents(employeId: Id | undefined) {
  return useSWR(
    employeId != null ? ['punchs-recents', String(employeId)] : null,
    () => chargerPunchs({ employeId, depuis: new Date(Date.now() - 24 * 3600 * 1000) }),
    { refreshInterval: 60_000 },
  )
}

export function useJobs(actifsSeulement = false) {
  return useSWR(['jobs', actifsSeulement], () => chargerJobs(actifsSeulement))
}

export function useEmployes() {
  return useSWR('employes', chargerEmployes)
}

export function rafraichirJobs() {
  return mutateGlobal((cle) => Array.isArray(cle) && cle[0] === 'jobs')
}

export function rafraichirPunchs() {
  return mutateGlobal(
    (cle) => Array.isArray(cle) && typeof cle[0] === 'string' && cle[0].startsWith('punchs'),
  )
}
