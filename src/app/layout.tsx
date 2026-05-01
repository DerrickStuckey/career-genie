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
      <body className="bg-stone-50 text-stone-900 antialiased">
        <SessionProvider>
          <div className="min-h-screen md:flex md:justify-center md:max-w-4xl md:mx-auto">
            <SmokeTrailNav side="left" />
            <div className="flex-1 md:px-10">
              {children}
            </div>
            <SmokeTrailNav side="right" />
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
