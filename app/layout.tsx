import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FFXIV Profile Card',
  description: 'ロドストからジョブレベルを読み込んで、FF14の自己紹介カードを作れるジェネレータ'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,400;6..96,500&family=Playfair+Display:wght@400;500&family=GFS+Didot&family=Cormorant+Garamond:wght@500;600&family=Shippori+Mincho:wght@400;600&family=Zen+Kaku+Gothic+New:wght@400;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
