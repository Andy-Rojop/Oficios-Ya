import type { Metadata, Viewport } from 'next';
import { Fraunces, Source_Sans_3 } from 'next/font/google';
import { SiteHeader } from '@/components/layout/site-header';
import { Providers } from '@/components/providers';
import './globals.css';

const sourceSans = Source_Sans_3({
  variable: '--font-source-sans',
  subsets: ['latin'],
  display: 'swap',
});

const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'OficiosYa',
    template: '%s · OficiosYa',
  },
  description:
    'Encontrá trabajadores de confianza en El Asintal, Retalhuleu. Carpintería, electricidad, plomería y más.',
  applicationName: 'OficiosYa',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'OficiosYa',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#1f6b3a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-GT" className={`${sourceSans.variable} ${fraunces.variable} h-full`}>
      <body className="min-h-full antialiased">
        <Providers>
          <SiteHeader />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
