import type { Metadata } from 'next';
import { Bricolage_Grotesque, Hanken_Grotesk, Geist_Mono } from 'next/font/google';
import './globals.css';
import { TrpcProvider } from '@/components/providers/TrpcProvider';

// Display face — headings (mapped to --font-display in globals.css)
const bricolage = Bricolage_Grotesque({
  variable: '--font-bricolage',
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
});

// Body / UI face (mapped to --font-sans in globals.css)
const hanken = Hanken_Grotesk({
  variable: '--font-hanken',
  subsets: ['latin'],
});

// Metrics & codes (mapped to --font-mono in globals.css)
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'CreatorLink',
  description: 'Conectá creadores con marcas',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${bricolage.variable} ${hanken.variable} ${geistMono.variable} antialiased`}>
        <TrpcProvider>{children}</TrpcProvider>
      </body>
    </html>
  );
}
