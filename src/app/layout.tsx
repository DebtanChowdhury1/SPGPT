"use client";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import Providers from "@/providers/ThemeProvider";
import ThemeToggle from "@/components/ThemeToggle";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className="transition-colors duration-300 bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-white">
          <Providers>
            <div className="min-h-screen">
              <ThemeToggle className="fixed right-4 top-4 z-50 shadow-lg" />
              {children}
            </div>
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
