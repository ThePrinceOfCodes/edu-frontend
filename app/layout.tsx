import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Edu Frontend",
  description: "Education dashboard with auth screens",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
              const THEME_KEY = "app-theme"
              const MODE_KEY = "app-theme-mode"
              const storedTheme = localStorage.getItem(THEME_KEY) || "forest-mono"
              const legacyMode = localStorage.getItem("theme")
              const storedMode = localStorage.getItem(MODE_KEY) || ((legacyMode === "dark" || legacyMode === "light") ? legacyMode : null)
              const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
              const shouldUseDark = storedMode ? storedMode === "dark" : prefersDark
              document.documentElement.setAttribute("data-theme", storedTheme)
              document.documentElement.classList.toggle("dark", shouldUseDark)
            })();`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
