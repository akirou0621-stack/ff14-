import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FFXIV Character Card Generator',
  description: 'Generate polished FFXIV character cards with profile details and job levels.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
