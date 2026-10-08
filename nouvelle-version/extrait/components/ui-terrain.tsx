'use client'

import { Loader2, X } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useId } from 'react'
import { cn } from '@/lib/utils'

export const classeChamp =
  'h-12 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50'

export function Champ({
  label,
  children,
  aide,
}: {
  label: string
  children: React.ReactNode
  aide?: string
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      {children}
      {aide && <span className="text-xs text-muted-foreground">{aide}</span>}
    </label>
  )
}

export function Feuille({
  ouvert,
  onFermer,
  titre,
  children,
}: {
  ouvert: boolean
  onFermer: () => void
  titre: string
  children: React.ReactNode
}) {
  const id = useId()
  useEffect(() => {
    if (!ouvert) return
    const touche = (e: KeyboardEvent) => e.key === 'Escape' && onFermer()
    window.addEventListener('keydown', touche)
    return () => window.removeEventListener('keydown', touche)
  }, [ouvert, onFermer])

  if (!ouvert) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 sm:items-center sm:p-4"
      onClick={onFermer}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border bg-card p-5 pb-8 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id={id} className="font-display text-2xl font-bold uppercase tracking-wide">
            {titre}
          </h2>
          <button
            type="button"
            onClick={onFermer}
            aria-label="Fermer"
            className="flex size-11 items-center justify-center rounded-full bg-secondary text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Chargement({ texte = 'Chargement…' }: { texte?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground" role="status">
      <Loader2 className="size-5 animate-spin" aria-hidden="true" />
      <span>{texte}</span>
    </div>
  )
}

export function MessageErreur({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-lg border border-destructive/50 bg-destructive/15 px-4 py-3 text-sm font-medium text-destructive"
    >
      {children}
    </p>
  )
}

export function Logo({ taille = 64, className }: { taille?: number; className?: string }) {
  return (
  <Image
  src="/logo.png"
  alt="Logo Entretien B.E.S.T. Terrain"
  width={taille}
  height={taille}
  sizes={`${taille}px`}
  quality={90}
  className={cn('rounded-xl object-contain', className)}
      style={{ width: taille, height: taille }}
      priority
    />
  )
}

export function BoutonPrincipal({
  className,
  chargement,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { chargement?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || chargement}
      className={cn(
        'flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 font-display text-xl font-bold uppercase tracking-wide text-primary-foreground transition active:scale-[0.98] disabled:opacity-40',
        className,
      )}
    >
      {chargement && <Loader2 className="size-5 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
}

export function BoutonSecondaire({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        'flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-secondary px-4 text-base font-semibold text-secondary-foreground transition active:scale-[0.98] disabled:opacity-40',
        className,
      )}
    />
  )
}
