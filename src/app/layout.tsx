import type { Metadata } from 'next';
import './globals.css';

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
    </html>
  );
}
