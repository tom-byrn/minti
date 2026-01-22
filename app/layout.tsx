import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { AIPopupProvider } from "@/components/ai-popup-provider"
import { TransactionSearchProvider } from "@/components/transaction-search-provider"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Minti",
  description: "Your AI-powered financial assistant",
  generator: "v0.app",
  icons: {
    icon: "/icon.svg",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <TransactionSearchProvider>
          <AIPopupProvider>{children}</AIPopupProvider>
        </TransactionSearchProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
