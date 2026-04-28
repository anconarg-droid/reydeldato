import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import HomeFooter from '@/components/home/HomeFooter'
import GlobalHeader from '@/components/GlobalHeader'
import PostHogProvider from '@/app/posthog-provider'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: 'Rey del Dato - Activa tu Comuna',
  description: 'Ayuda a activar tu comuna registrando emprendimientos locales',
  generator: 'v0.app',
  icons: {
    icon: [
      { url: "/window.svg", type: "image/svg+xml" },
      { url: "/rey-del-dato-logo-teal.png", type: "image/png" },
    ],
    apple: "/rey-del-dato-logo-teal.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
        style={{
          fontFamily:
            'var(--font-geist-sans), ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        <PostHogProvider>
          <div className="min-h-screen flex flex-col">
            <GlobalHeader />
            <main className="flex-1 pb-[80px]">{children}</main>
            <HomeFooter />
          </div>
        </PostHogProvider>
      </body>
    </html>
  )
}
