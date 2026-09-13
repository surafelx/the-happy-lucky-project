import type { Metadata, Viewport } from "next";

import "@fontsource-variable/outfit";
import "@fontsource-variable/fraunces";

import "./globals.css";

import { ShopProvider } from "@/context/ShopContext";
import { SiteBackground } from "@/components/SiteBackground";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MobileMenu from "@/components/MobileMenu";
import CartDrawer from "@/components/CartDrawer";
import DonateModal from "@/components/DonateModal";

export const metadata: Metadata = {
  title: {
    default: "The Happy Lucky Project",
    template: "%s · The Happy Lucky Project",
  },
  description:
    "A community project turning small luck into real change — school fees, laptops, libraries, studios and the Sunday rhythm in Addis Ababa.",
  openGraph: {
    title: "The Happy Lucky Project",
    description:
      "Small coins, big luck — a community fund for education, arts and care.",
    siteName: "The Happy Lucky Project",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "The Happy Lucky Project",
    description: "Small coins, big luck.",
  },
};

export const viewport: Viewport = {
  themeColor: "#e6918e",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col">
        <ShopProvider>
          <SiteBackground />
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <MobileMenu />
          <CartDrawer />
          <DonateModal />
        </ShopProvider>
      </body>
    </html>
  );
}