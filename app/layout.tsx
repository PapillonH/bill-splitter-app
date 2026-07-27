import React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "../src/components/theme-provider"
import ServiceWorkerRegistration from "../src/components/service-worker-registration"
import AppTelemetry from "../src/components/app-telemetry"

export const metadata: Metadata = {
  title: "Vizzle — Bill Splitter",
  description: "Scan, assign, and split a bill with friends.",
  applicationName: "Vizzle",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Vizzle" },
  formatDetection: { telephone: false },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return ( 
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <ServiceWorkerRegistration />
          <AppTelemetry />
        </ThemeProvider>
      </body>
    </html>
  )
}
