import type {Metadata} from "next";
import {Geist, Geist_Mono} from "next/font/google";
import "./globals.css";

const sans = Geist({variable: "--font-geist-sans", subsets: ["latin"]});
const mono = Geist_Mono({variable: "--font-geist-mono", subsets: ["latin"]});
const siteUrl = "https://maipu-zona-6-provisiones.nickooftheabyss.chatgpt.site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Control de provisiones · Maipú Zona 6",
  description: "Dashboard de seguimiento contractual de provisiones y consulta directa de la base técnica.",
  openGraph: {
    title: "Control de provisiones · Maipú Zona 6",
    description: "Seguimiento contractual y consulta directa de la base técnica.",
    url: siteUrl,
    siteName: "Control de provisiones",
    locale: "es_CL",
    type: "website",
    images: [{url: "/og.png", width: 1680, height: 945, alt: "Control de provisiones · Maipú Zona 6"}],
  },
  twitter: {
    card: "summary_large_image",
    title: "Control de provisiones · Maipú Zona 6",
    description: "Seguimiento contractual y consulta directa de la base técnica.",
    images: ["/og.png"],
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="es">
      <body className={`${sans.variable} ${mono.variable}`}>{children}</body>
    </html>
  );
}
