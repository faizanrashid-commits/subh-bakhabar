import type { Metadata } from "next";
import { Playfair_Display, Source_Serif_4, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  weight: ["400", "600", "700", "800", "900"],
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "SUBH BAKHABAR (صبح باخبر) — Your World, In Perspective",
  description:
    "An agentic, finite morning newspaper that understands who you are, how world events intersect with your life, what changed since yesterday, and who you want to become.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${sourceSerif.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-[#f9f6ef] text-[#111111] selection:bg-[#111111] selection:text-[#f9f6ef]">
        {children}
      </body>
    </html>
  );
}
