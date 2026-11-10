import type { Metadata } from "next";
import "./globals.css";
import { BRAND } from "@/data/brand";
import { FONT_VARIABLES } from "@/data/fonts";
import { SiteBackground } from "@/components/layout/site-background";
import { ReduxProvider } from "@/store/redux-provider";
import { ToastProvider } from "@/components/toast/toast-provider";

export const metadata: Metadata = {
  title: {
    default: BRAND.name,
    template: `%s — ${BRAND.name}`,
  },
  description: BRAND.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`h-full antialiased ${FONT_VARIABLES.join(" ")}`}>
      <link rel="preconnect" href="https://fonts.googleapis.com" precedence="low" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
        precedence="low"
      />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        precedence="default"
      />
      <body
        suppressHydrationWarning
        className="relative flex min-h-full flex-col justify-between overflow-x-hidden bg-navy text-foam selection:bg-ice/30 selection:text-foam"
      >
        <SiteBackground />
        <ReduxProvider>
          <ToastProvider>{children}</ToastProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
