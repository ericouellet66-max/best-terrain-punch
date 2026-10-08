import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Barlow_Condensed, Inter } from 'next/font/google'
import { AuthProvider } from '@/components/auth-provider'
import { EnregistrerServiceWorker } from '@/components/enregistrer-sw'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const barlow = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-barlow',
})

export const metadata: Metadata = {
  title: 'B.E.S.T. Terrain Punch',
  description: 'Punch de présence des employés — Entretien B.E.S.T. Terrain',
  applicationName: 'B.E.S.T. Terrain Punch',
  generator: 'v0.app',
  appleWebApp: { capable: true, title: 'BEST Punch', statusBarStyle: 'black-translucent' },
  icons: {
    icon: '/icons/icon.png',
    apple: '/icons/icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#151515',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr-CA" className={`${inter.variable} ${barlow.variable} bg-background`}>
      <body className="font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
        <EnregistrerServiceWorker />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
