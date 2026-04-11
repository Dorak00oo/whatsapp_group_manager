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
  title: "Registros WA / Minecraft",
  description: "Usuarios, login y registros con Next.js, Neon y Auth.js",
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
      className={`${geistSans.variable} min-h-full antialiased${defaultThemeDark ? " dark" : ""}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-background dark:bg-transparent">
        <Providers defaultThemeDark={defaultThemeDark}>{children}</Providers>
      </body>
    </html>
  );
}
