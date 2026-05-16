import type { Metadata } from 'next';
import './globals.css';
import LlmStatus from '@/components/LlmStatus';

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
      <body>{children}</body>
      <LlmStatus />
    </html>
  );
}
