import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import LlmStatus from '@/components/LlmStatus';
import '@fontsource/eb-garamond/500.css';
import '@fontsource/eb-garamond/600.css';
import '@fontsource/literata/400.css';
import '@fontsource/literata/700.css';

export const metadata: Metadata = {
  title: 'Four Warned: Regent',
  description: 'A text-driven medieval governance simulation',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="regent-shell">
        {children}
        <LlmStatus />
        <Analytics />
      </body>
    </html>
  );
}
