'use client'

import { Info, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { mutate } from 'swr'
import { useAuth } from '@/components/auth-provider'
import { BoutonPrincipal, Champ, Chargement, classeChamp, Feuille, MessageErreur } from '@/components/ui-terrain'
import { enregistrerEmploye } from '@/lib/donnees'
import { useEmployes } from '@/lib/hooks'
import { getSupabase } from '@/lib/supabase'
import type { Employe, Role } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Brouillon {
  id?: Employe['id']
  nom: string
  courriel: string
  telephone: string
  role: Role
  actif: boolean
  motDePasse: string
  aCompte: boolean
}

const vide: Brouillon = { nom: '', courriel: '', telephone: '', role: 'employe', actif: true, motDePasse: '', aCompte: false }

export function AdminEmployes() {
  const { employe: moi } = useAuth()
  const restreint = moi?.role === 'sous_admin'
  const { data: employes, error, isLoading } = useEmployes()
  const [brouillon, setBrouillon] = useState<Brouillon | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [succes, setSucces] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)

  function ouvrir(e?: Employe) {
    setErreur(null)
    setSucces(null)
    if (restreint && !e) return
    setBrouillon(
      e
        ? {
            id: e.id,
            nom: e.nom ?? '',
            courriel: e.courriel ?? '',
            telephone: e.telephone ?? '',
            role: e.role,
            actif: e.actif,
            motDePasse: '',
            aCompte: Boolean(e.user_id),
          }
        : vide,
    )
  }

  async function soumettre(ev: React.FormEvent) {
    ev.preventDefault()
    if (!brouillon) return
    if (restreint && (brouillon.id == null || brouillon.role !== 'employe')) return setErreur('Modification non autorisée.')
    const estMoi = brouillon.id != null && String(brouillon.id) === String(moi?.id)
    if (estMoi && (brouillon.role !== 'admin' || !brouillon.actif)) {
      return setErreur('Vous ne pouvez pas retirer vos propres droits administrateur.')
    }
    setEnvoi(true)
    setErreur(null)
    try {
      if (brouillon.id != null) {
        await enregistrerEmploye(
          {
            nom: brouillon.nom.trim(),
            courriel: brouillon.courriel.trim().toLowerCase() || null,
            telephone: brouillon.telephone.trim() || null,
            ...(!restreint ? { role: brouillon.role, actif: brouillon.actif } : {}),
          },
          brouillon.id,
        )
        setBrouillon(null)
      } else {
        if (brouillon.motDePasse.length < 8) throw new Error('Le mot de passe doit contenir au moins 8 caractères.')
        // Création du compte via la fonction serveur Supabase « creer-employe » (clé service_role côté serveur seulement).
        const { data, error: errFn } = await getSupabase().functions.invoke('creer-employe', {
          body: {
            nom: brouillon.nom.trim(),
            courriel: brouillon.courriel.trim(),
            telephone: brouillon.telephone.trim(),
            role: brouillon.role,
            motDePasse: brouillon.motDePasse,
          },
        })
        if (errFn) {
          const detail = await errFn.context?.json?.().catch(() => null)
          throw new Error(
            detail?.error ??
              'La fonction serveur « creer-employe » est introuvable ou a échoué. Déployez-la dans Supabase (voir supabase/functions/creer-employe).',
          )
        }
        if (data?.error) throw new Error(data.error)
        setSucces(`Compte créé pour ${brouillon.nom}. Transmettez-lui son courriel et son mot de passe.`)
        setBrouillon(null)
      }
      await mutate('employes')
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setEnvoi(false)
    }
  }

  if (isLoading) return <Chargement />

  return (
    <div className="flex flex-col gap-3">
      {!restreint && <BoutonPrincipal onClick={() => ouvrir()}>
        <UserPlus className="size-5" aria-hidden="true" />
        Créer un employé
      </BoutonPrincipal>}
      {restreint && <p className="text-sm text-muted-foreground">Accès B.E.S.T. Terrain : modification des coordonnées des employés seulement.</p>}
      {succes && <p role="status" className="rounded-lg bg-success/15 px-4 py-3 text-sm font-medium text-success">{succes}</p>}
      {error && <MessageErreur>{(error as Error).message}</MessageErreur>}
      <ul className="flex flex-col gap-2">
        {employes?.filter(e => !restreint || (e.employeur === 'best' && e.role === 'employe')).map((e) => (
          <li key={String(e.id)}>
            <button
              type="button"
              onClick={() => ouvrir(e)}
              className={cn('flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left', !e.actif && 'opacity-60')}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{e.nom}</p>
                <p className="truncate text-xs text-muted-foreground">{e.courriel ?? 'Aucun courriel'}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1 text-xs font-semibold">
                <span className={e.role === 'admin' ? 'text-primary' : 'text-muted-foreground'}>
                  {e.role === 'admin' ? 'Admin' : e.role === 'sous_admin' ? 'Sous-admin' : 'Employé'}
                </span>
                {!e.actif && <span className="text-destructive">Inactif</span>}
                {!e.user_id && e.actif && <span className="text-muted-foreground">Sans compte</span>}
              </div>
            </button>
          </li>
        ))}
      </ul>

      <Feuille
        ouvert={brouillon !== null}
        onFermer={() => setBrouillon(null)}
        titre={brouillon?.id != null ? 'Modifier l’employé' : 'Nouvel employé'}
      >
        {brouillon && (
          <form onSubmit={soumettre} className="flex flex-col gap-4">
            <Champ label="Nom complet">
              <input required value={brouillon.nom} onChange={(e) => setBrouillon({ ...brouillon, nom: e.target.value })} className={classeChamp} />
            </Champ>
            <Champ label="Courriel (identifiant de connexion)">
              <input
                type="email"
                required={brouillon.id == null}
                disabled={brouillon.aCompte}
                value={brouillon.courriel}
                onChange={(e) => setBrouillon({ ...brouillon, courriel: e.target.value })}
                className={classeChamp}
              />
            </Champ>
            <Champ label="Téléphone">
              <input type="tel" value={brouillon.telephone} onChange={(e) => setBrouillon({ ...brouillon, telephone: e.target.value })} className={classeChamp} />
            </Champ>
            {!restreint && <Champ label="Rôle">
              <select value={brouillon.role} onChange={(e) => setBrouillon({ ...brouillon, role: e.target.value as Role })} className={classeChamp}>
                <option value="employe">Employé</option>
                <option value="admin">Administrateur</option>
                <option value="sous_admin">Sous-administrateur B.E.S.T.</option>
              </select>
            </Champ>}
            {brouillon.id == null ? (
              <>
                <Champ label="Mot de passe temporaire" aide="Au moins 8 caractères.">
                  <input
                    type="text"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={brouillon.motDePasse}
                    onChange={(e) => setBrouillon({ ...brouillon, motDePasse: e.target.value })}
                    className={classeChamp}
                  />
                </Champ>
                <p className="flex gap-2 rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
                  <Info className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  Le compte est créé par la fonction serveur Supabase « creer-employe ». Aucune clé secrète n’est
                  utilisée dans le navigateur.
                </p>
              </>
            ) : (
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={brouillon.actif}
                  onChange={(e) => setBrouillon({ ...brouillon, actif: e.target.checked })}
                  className="size-6 accent-[var(--primary)]"
                />
                <span className="font-medium">Employé actif (peut se connecter et puncher)</span>
              </label>
            )}
            {erreur && <MessageErreur>{erreur}</MessageErreur>}
            <BoutonPrincipal type="submit" chargement={envoi}>
              {brouillon.id == null ? 'Créer le compte' : 'Enregistrer'}
            </BoutonPrincipal>
          </form>
        )}
      </Feuille>
    </div>
  )
}
