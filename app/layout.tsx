import type {Metadata} from "next";
import {Geist,Geist_Mono} from "next/font/google";
import "./globals.css";
const sans=Geist({variable:"--font-geist-sans",subsets:["latin"]});
const mono=Geist_Mono({variable:"--font-geist-mono",subsets:["latin"]});
export const metadata:Metadata={title:"Control de Provisiones · Maipú Zona 6",description:"Dashboard de seguimiento contractual de provisiones."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es"><body className={`${sans.variable} ${mono.variable}`}>{children}</body></html>}
