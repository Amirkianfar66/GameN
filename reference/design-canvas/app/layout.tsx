import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"Mothership | Game Design Canvas",description:"Interactive Mothership game design board, role map and playtest alpha."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" dir="ltr"><body>{children}</body></html>}
