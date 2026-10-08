'use client'

import { Bell, BellOff, Download, LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import { BoutonPrincipal, BoutonSecondaire, classeChamp, MessageErreur } from '@/components/ui-terrain'
import {
  afficherNotification,
  ecrirePrefs,
  lirePrefs,
  notificationsSupportees,
  type PrefsRappels,
} from '@/lib/rappels'

interface EvenementInstallation extends Event {
  prompt: () => Promise<void>
}

function LigneRappel({
  titre,
  description,
  actif,
  heure,
  onActif,
  onHeure,
}: {
  titre: string
  description: string
  actif: boolean
  heure: string
  onActif: (v: boolean) => void
  onHeure: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-3 border-t border-border py-3">
      <label className="flex flex-1 items-center gap-3">
        <input
          type="checkbox"
          checked={actif}
          onChange={(e) => onActif(e.target.checked)}
          className="size-6 accent-[var(--primary)]"
        />
        <span>
          <span className="block font-semibold">{titre}</span>
          <span className="block text-xs text-muted-foreground">{description}</span>
        </span>
      </label>
      <input
        type="time"
        value={heure}
        onChange={(e) => onHeure(e.target.value)}
        aria-label={`Heure du rappel : ${titre}`}
        className={`${classeChamp} w-28`}
      />
    </div>
  )
}

export function Reglages() {
  const { employe, session, deconnexion } = useAuth()
  const [prefs, setPrefs] = useState<PrefsRappels>(lirePrefs)
  const [permission, setPermission] = useState<NotificationPermission | 'non_supporte'>(() =>
    notificationsSupportees() ? Notification.permission : 'non_supporte',
  )
  const [installation, setInstallation] = useState<EvenementInstallation | null>(null)

  useEffect(() => {
    const capter = (e: Event) => {
      e.preventDefault()
      setInstallation(e as EvenementInstallation)
    }
    window.addEventListener('beforeinstallprompt', capter)
    return () => window.removeEventListener('beforeinstallprompt', capter)
  }, [])

  function maj(partiel: Partial<PrefsRappels>) {
    const suivant = { ...prefs, ...partiel }
    setPrefs(suivant)
    ecrirePrefs(suivant)
  }

  async function activer() {
    if (!notificationsSupportees()) return
    const resultat = await Notification.requestPermission()
    setPermission(resultat)
    if (resultat === 'granted') maj({ actif: true })
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-3xl font-bold uppercase">Réglages</h1>

      <section className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Connecté en tant que</p>
        <p className="text-lg font-semibold">{employe?.nom}</p>
        <p className="text-sm text-muted-foreground">{session?.user.email}</p>
        <p className="mt-1 text-xs uppercase tracking-wide text-primary">
          {employe?.role === 'admin' ? 'Administrateur' : employe?.role === 'sous_admin' ? 'Sous-administratrice (heures)' : 'Employé'}
        </p>
      </section>

      <section aria-labelledby="titre-rappels" className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <h2 id="titre-rappels" className="font-display text-2xl font-bold uppercase">Rappels</h2>

        {permission === 'non_supporte' && (
          <MessageErreur>Les notifications ne sont pas supportées sur cet appareil ou ce navigateur.</MessageErreur>
        )}
        {permission === 'denied' && (
          <MessageErreur>
            Les notifications sont bloquées. Autorisez-les dans les paramètres du navigateur pour ce site.
          </MessageErreur>
        )}
        {permission === 'default' && (
          <BoutonPrincipal onClick={activer}>
            <Bell className="size-5" aria-hidden="true" />
            Activer les notifications
          </BoutonPrincipal>
        )}
        {permission === 'granted' && (
          <label className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 font-semibold">
              {prefs.actif ? <Bell className="size-5 text-primary" aria-hidden="true" /> : <BellOff className="size-5" aria-hidden="true" />}
              Rappels activés
            </span>
            <input
              type="checkbox"
              checked={prefs.actif}
              onChange={(e) => maj({ actif: e.target.checked })}
              className="size-6 accent-[var(--primary)]"
            />
          </label>
        )}

        <div className={prefs.actif && permission === 'granted' ? '' : 'pointer-events-none opacity-50'}>
          <LigneRappel
            titre="Punch du matin"
            description="Si vous n’êtes pas encore punché"
            actif={prefs.matinActif}
            heure={prefs.matin}
            onActif={(v) => maj({ matinActif: v })}
            onHeure={(v) => maj({ matin: v })}
          />
          <LigneRappel
            titre="Dîner"
            description="Si le dîner n’est pas commencé"
            actif={prefs.dinerActif}
            heure={prefs.diner}
            onActif={(v) => maj({ dinerActif: v })}
            onHeure={(v) => maj({ diner: v })}
          />
          <LigneRappel
            titre="Souper"
            description="Si le souper n’est pas commencé"
            actif={prefs.souperActif}
            heure={prefs.souper}
            onActif={(v) => maj({ souperActif: v })}
            onHeure={(v) => maj({ souper: v })}
          />
          <LigneRappel
            titre="Fin de journée"
            description="Si vous êtes encore punché"
            actif={prefs.finJourneeActif}
            heure={prefs.finJournee}
            onActif={(v) => maj({ finJourneeActif: v })}
            onHeure={(v) => maj({ finJournee: v })}
          />
        </div>

        {permission === 'granted' && (
          <BoutonSecondaire onClick={() => afficherNotification('Test B.E.S.T. Punch', 'Les rappels fonctionnent!', 'test')}>
            Envoyer une notification test
          </BoutonSecondaire>
        )}
        <p className="text-xs text-muted-foreground">
          Les rappels fonctionnent quand l’application est ouverte ou installée sur l’écran d’accueil. Des rappels
          envoyés par le serveur (Web Push) pourront être ajoutés plus tard.
        </p>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-display text-2xl font-bold uppercase">Installer l’app</h2>
        {installation ? (
          <BoutonPrincipal
            onClick={async () => {
              await installation.prompt()
              setInstallation(null)
            }}
          >
            <Download className="size-5" aria-hidden="true" />
            Installer sur ce téléphone
          </BoutonPrincipal>
        ) : (
          <p className="text-sm text-muted-foreground">
            Sur Android (Chrome) : menu ⋮ puis « Ajouter à l’écran d’accueil » ou « Installer l’application ».
          </p>
        )}
      </section>

      <BoutonSecondaire onClick={deconnexion} className="h-14">
        <LogOut className="size-5" aria-hidden="true" />
        Se déconnecter
      </BoutonSecondaire>
    </div>
  )
}
