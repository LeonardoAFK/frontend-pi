import type { Metadata } from "next";
import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";
import { QueryProvider } from "@/providers/query-provider";
import { Navbar } from "@/components/layout/navbar";

export const metadata: Metadata = {
  title: "EventMap",
  description: "Mapa de eventos creados por usuarios",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <QueryProvider>
          <Navbar />
          <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
        </QueryProvider>
      </body>
    </html>
  );
}