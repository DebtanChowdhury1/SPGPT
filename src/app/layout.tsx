"use client";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import Providers from "@/providers/ThemeProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className="transition-colors duration-300 bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-white">
          <Providers>{children}</Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
