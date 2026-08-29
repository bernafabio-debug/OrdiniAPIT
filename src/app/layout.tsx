import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PO Manager Service",
  description: "Gestione richieste di acquisto materiali"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
