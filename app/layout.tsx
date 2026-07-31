import type { Metadata } from 'next'
import './globals.css'
import { AccountProvider } from '@/lib/AccountContext'
import Sidebar from '@/components/Sidebar'

export const metadata: Metadata = {
  title: 'Creative Dashboard',
  description: 'Meta Ads creative performance analytics',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased" style={{ background: '#0d0918' }}>
        <AccountProvider>
          <div className="flex h-full overflow-hidden">
            <Sidebar />
            <div className="flex flex-col flex-1 overflow-hidden">{children}</div>
          </div>
        </AccountProvider>
      </body>
    </html>
  )
}
