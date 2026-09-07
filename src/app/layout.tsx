import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DAEROOM AGENT HQ — AI Enterprise Mission Control',
  description: 'Central Command Center for Autonomous AI Workforce & 24/7 Academic Ecosystem',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
