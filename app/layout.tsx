import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  metadataBase: new URL("https://campwork.vercel.app"),
  title: "Campwork | Student Freelance Marketplace",
  description: "The student-only freelance marketplace. Offer your skills, find flexible gigs, and earn income while studying at university.",
  keywords: ["freelance", "students", "university gigs", "campus jobs", "student work", "freelance marketplace", "campwork"],
  authors: [{ name: "Campwork Team" }],
  openGraph: {
    title: "Campwork | Student Freelance Marketplace",
    description: "Freelancing for students, by students. Connect with trusted campus talent today.",
    url: "https://campwork.vercel.app",
    siteName: "Campwork",
    images: [
      {
        url: "/assets/ogImg.png",
        width: 800,
        height: 600,
        alt: "Campwork Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Campwork | Student Freelance Marketplace",
    description: "The student-only freelance marketplace. Offer your skills and earn income.",
    images: ["/assets/ogImg.png"],
  },
  icons: {
    icon: "/favicon.ico",
  },
};

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { NotificationListener } from "@/components/NotificationListener";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <NotificationListener />
          <Toaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{
              style: {
                borderRadius: '1.25rem',
                border: '1px solid var(--border)',
                background: 'var(--background)',
                color: 'var(--foreground)',
              },
              className: "font-sans",
            }}
          />
          {children}
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
