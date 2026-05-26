import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import GlobalErrorBoundary from "@/components/GlobalErrorBoundary";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SanalParsel - AI Destekli Emlak Video Platformu",
  description: "GeoJSON yükle, cinematic drone videosu üret, Reels olarak paylaş. Emlak danışmanları için profesyonel video üretim platformu.",
  keywords: ["emlak", "drone video", "GeoJSON", "parseller", "REEL", "AI video"],
  openGraph: {
    title: "SanalParsel",
    description: "Parselini AI destekli drone videosuna dönüştür",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={`${inter.className} antialiased`}>
        <GlobalErrorBoundary>
          {children}
        </GlobalErrorBoundary>
      </body>
    </html>
  );
}
