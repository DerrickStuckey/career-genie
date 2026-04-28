import type { Metadata } from 'next';
import { SessionProvider } from '@/context/SessionContext';
import { SmokeTrailNav } from '@/components/SmokeTrailNav';
import './globals.css';

export const metadata: Metadata = {
  title: 'Career Genie',
  description: 'AI-powered career coaching',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <SessionProvider>
          <div className="min-h-screen md:flex md:justify-center md:max-w-3xl md:mx-auto">
            <SmokeTrailNav />
            <div className="flex-1">
              {children}
            </div>
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
