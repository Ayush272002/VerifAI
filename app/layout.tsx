import type { Metadata } from "next";
import { Inter, DM_Sans, DM_Serif_Text, JetBrains_Mono } from 'next/font/google';
import "./globals.css";
import Web3Provider from "@/components/Web3Provider";

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
});

const dmSerifText = DM_Serif_Text({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-dm-serif',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
});

export const metadata: Metadata = {
  title: 'Rightful | Intellectual Property Detection',
  description:
    'Secure blockchain-based platform for document similarity detection and intellectual property protection',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} ${dmSerifText.variable} ${inter.variable} ${jetbrainsMono.variable} font-inter antialiased`}
      >
        <Web3Provider>
          <div className="min-h-screen flex flex-col">{children}</div>
        </Web3Provider>
      </body>
    </html>
  );
}
