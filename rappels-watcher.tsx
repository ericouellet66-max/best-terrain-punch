'use client'

import { useEffect, useRef } from 'react'
import { usePunchsRecents } from '@/lib/hooks'
import { calculerEtat, type EtatEmploye } from '@/lib/punch'
import {
  afficherNotification,
  dejaEnvoye,
  lirePrefs,
  marquerEnvoye,
  minutesDepuis,
} from '@/lib/rappels'
import { cleJour, heureMuraleHM } from '@/lib/temps'
import type { Id } from '@/lib/types'

const FENETRE_MINUTES = 30

/** Rappels locaux pendant que l'application est ouverte ou en arrière-plan. */
export function RappelsWatcher({ employeId }: { employeId: Id }) {
  const { data } = usePunchsRecents(employeId)
  const etatRef = useRef<EtatEmploye | null>(null)
  etatRef.current = data ? calculerEtat(data) : null

  useEffect(() => {
    const verifier = () => {
      const etat = etatRef.current
      const prefs = lirePrefs()
      if (!etat || !prefs.actif) return
      const maintenant = heureMuraleHM()
      const jour = cleJour(new Date())

      const rappels = [
        {
          cle: 'matin',
          actif: prefs.matinActif,
          heure: prefs.matin,
          condition: etat.etat === 'non_punche',
          titre: 'Bon matin!',
          corps: 'N’oubliez pas votre PUNCH ARRIVÉE.',
        },
        {
          cle: 'diner',
          actif: prefs.dinerActif,
          heure: prefs.diner,
          condition: etat.etat === 'au_travail' && !etat.dinerFait,
          titre: 'Heure du dîner',
          corps: 'Pensez à faire DÉBUT DÎNER si vous prenez votre pause.',
        },
        {
          cle: 'souper',
          actif: prefs.souperActif,
          heure: prefs.souper,
          condition: etat.etat === 'au_travail' && !etat.souperFait,
          titre: 'Heure du souper',
          corps: 'Pensez à faire DÉBUT SOUPER si vous prenez votre pause.',
        },
        {
          cle: 'fin',
          actif: prefs.finJourneeActif,
          heure: prefs.finJournee,
          condition: etat.etat !== 'non_punche',
          titre: 'Toujours punché',
          corps: 'Vous êtes encore punché. N’oubliez pas FIN DE JOURNÉE.',
        },
      ]

      for (const r of rappels) {
        const ecart = minutesDepuis(r.heure, maintenant)
        const cle = `${r.cle}:${jour}`
        if (r.actif && r.condition && ecart >= 0 && ecart < FENETRE_MINUTES && !dejaEnvoye(cle)) {
          marquerEnvoye(cle)
          afficherNotification(r.titre, r.corps, `rappel-${r.cle}`)
        }
      }
    }

    verifier()
    const intervalle = setInterval(verifier, 60_000)
    return () => clearInterval(intervalle)
  }, [])

  return null
}
