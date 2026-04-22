import type { Metadata } from 'next';
import { SessionProvider } from '@/context/SessionContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'Career Genie',
  description: 'AI-powered career coaching',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
