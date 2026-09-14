import type { Metadata, Viewport } from "next";
import { Luckiest_Guy, Poppins } from "next/font/google";
import Script from "next/script";

import "./globals.css";

import { SvgDefs } from "@/components/SvgDefs";
import { Nav } from "@/components/Nav";
import { Confetti } from "@/components/Confetti";
import { Backdrop } from "@/components/Backdrop";
import { Toast } from "@/components/Toast";

const lucky = Luckiest_Guy({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-lucky",
  fallback: ["Arial Black", "Impact", "sans-serif"],
  display: "swap",
});

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-poppins",
  fallback: ["Segoe UI", "Helvetica", "Arial", "sans-serif"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "The Happy Lucky Project", template: "%s · The Happy Lucky Project" },
  description:
    "A project about childhood, luck, and the people who show up. It began as a letter on a Sunday. Come and build it with me.",
  openGraph: {
    title: "The Happy Lucky Project",
    description: "Come and build it with me. Not for me. With me.",
    siteName: "The Happy Lucky Project",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6FFFA" },
    { media: "(prefers-color-scheme: dark)", color: "#0F1D1E" },
  ],
};

// Applies the stored theme before first paint so the page never flashes the wrong colours.
const themeInit = `try{var t=localStorage.getItem('hlp-theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t;}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${lucky.variable} ${poppins.variable}`} suppressHydrationWarning>
      <body>
        <Script id="theme-init" strategy="beforeInteractive">{themeInit}</Script>
        <SvgDefs />
        <Backdrop />
        <Confetti />
        <Nav />
        <main id="top">{children}</main>
        <Toast />
      </body>
    </html>
  );
}
