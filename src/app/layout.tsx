import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { cookies } from "next/headers";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Panel de la comunidad",
  description:
    "Directorio de personas, WhatsApp y Minecraft. Entrá con la cuenta compartida.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = (await cookies()).get("theme")?.value;
  const defaultThemeDark = theme === "dark";

  return (
    <html
      lang="es"
      className={`${geistSans.variable} min-h-dvh antialiased${defaultThemeDark ? " dark" : ""}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-dvh flex-col bg-background dark:bg-transparent">
        <Providers defaultThemeDark={defaultThemeDark}>{children}</Providers>
      </body>
    </html>
  );
}
