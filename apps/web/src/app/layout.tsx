import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AI eBook Creator',
  description: 'Create professional eBooks with AI assistance - powered by GOAP architecture',
  keywords: ['eBook', 'AI', 'writing', 'publishing', 'automation'],
  authors: [{ name: 'AI eBook Creator Team' }],
  openGraph: {
    title: 'AI eBook Creator',
    description: 'Create professional eBooks with AI assistance',
    type: 'website',
    locale: 'en_US',
    alternateLocale: ['de_DE'],
  },
  robots: {
    index: true,
    follow: true,
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

interface RootLayoutProps {
  children: React.ReactNode;
  params: {
    locale?: string;
  };
}

export default function RootLayout({
  children,
  params,
}: RootLayoutProps) {
  return (
    <html
      lang={params.locale || 'en'}
      suppressHydrationWarning
      className="scroll-smooth"
    >
      <head>
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="AI eBook Creator" />
        <meta name="application-name" content="AI eBook Creator" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#000000" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <Providers>
          <div className="relative min-h-screen bg-background font-sans antialiased">
            <div className="relative flex min-h-screen flex-col">
              <Header />
              
              <main className="flex-1">
                {children}
              </main>
              
              <Footer />
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}