'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ajouterJours, cleJour, cleSemaine, libelleJour } from '@/lib/temps'

export function semaineCourante() {
  return cleSemaine(cleJour(new Date()))
}

export function NavigateurSemaine({
  dimanche,
  onChanger,
}: {
  dimanche: string
  onChanger: (dimanche: string) => void
}) {
  const estCourante = dimanche === semaineCourante()
  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card p-2">
      <button
        type="button"
        onClick={() => onChanger(ajouterJours(dimanche, -7))}
        aria-label="Semaine précédente"
        className="flex size-12 items-center justify-center rounded-xl bg-secondary"
      >
        <ChevronLeft className="size-6" aria-hidden="true" />
      </button>
      <div className="text-center">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {estCourante ? 'Cette semaine' : 'Semaine du'}
        </p>
        <p className="font-semibold">
          {libelleJour(dimanche)} – {libelleJour(ajouterJours(dimanche, 6))}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onChanger(ajouterJours(dimanche, 7))}
        disabled={estCourante}
        aria-label="Semaine suivante"
        className="flex size-12 items-center justify-center rounded-xl bg-secondary disabled:opacity-30"
      >
        <ChevronRight className="size-6" aria-hidden="true" />
      </button>
    </div>
  )
}
