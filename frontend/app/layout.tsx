import type { Metadata } from 'next'
import './globals.css'
import AuthProvider from '@/components/AuthProvider'
import { ServerProvider } from '@/contexts/ServerContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import ErrorBoundary from '@/components/ErrorBoundary'

export const metadata: Metadata = {
  title: 'Stoffel\'s RedM Empresas - Dashboard',
  description: 'Real-time dashboard for Stoffel\'s RedM Empresas server management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <ErrorBoundary>
          <LanguageProvider>
            <ThemeProvider>
              <AuthProvider>
                <ServerProvider>
                  <div className="flex min-h-screen">
                    <main className="flex-1">
                      {children}
                    </main>
                  </div>
                </ServerProvider>
              </AuthProvider>
            </ThemeProvider>
          </LanguageProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}