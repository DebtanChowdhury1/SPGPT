"use client";
import { ThemeProvider } from "next-themes";
import { ReactNode, useEffect, useState } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {mounted ? children : <div className="opacity-0">{children}</div>}
    </ThemeProvider>
  );
}
