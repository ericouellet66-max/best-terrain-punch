import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'B.E.S.T. Terrain Punch',
    short_name: 'BEST Punch',
    description: 'Punch de présence des employés — Entretien B.E.S.T. Terrain',
    lang: 'fr-CA',
    start_url: '/punch',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#151515',
    theme_color: '#151515',
    icons: [
      { src: '/icons/icon.png', sizes: '1024x1024', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon.png', sizes: '1024x1024', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
