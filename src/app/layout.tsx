"use client";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import Providers from "@/providers/ThemeProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className="bg-[#05060d] text-slate-100 transition-colors duration-300">
          <Providers>{children}</Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
