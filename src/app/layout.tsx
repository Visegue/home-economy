import type { Metadata } from "next";
import type { ReactNode } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";

import { ThemeProvider } from "@home-economy/ui/theme";
import { themeBootstrapScript } from "@home-economy/ui/theme-script";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Hemekonomi",
    template: "%s · Hemekonomi",
  },
  description: "Planera hushållets ekonomi utan kalkylblad.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="sv" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body>
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
