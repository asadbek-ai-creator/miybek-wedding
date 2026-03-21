import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0A0A0A",
};

export const metadata: Metadata = {
  title: "Wedding Camera | Capture Your Moments",
  description:
    "A digital disposable camera for your wedding. Guests capture moments with beautiful filters and share them in a live gallery.",
  openGraph: {
    title: "Wedding Camera | Capture Your Moments",
    description:
      "A digital disposable camera for your wedding guests.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <body className="min-h-dvh flex flex-col bg-dark text-white antialiased">
        {children}
      </body>
    </html>
  );
}
