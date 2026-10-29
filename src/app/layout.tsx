import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/layout/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Atom Nexus — Engineer your future with expert-led courses",
    template: "%s | Atom Nexus",
  },
  description:
    "Atom Nexus is a premium multilingual learning platform. Explore expert-led video courses, learn at your own pace, switch audio languages, and track your progress.",
  keywords: ["online courses", "learning platform", "LMS", "video courses", "multilingual", "Atom Nexus"],
  authors: [{ name: "Atom Nexus" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Atom Nexus — Engineer your future",
    description: "Expert-led video courses with multilingual audio. Learn at your own pace.",
    siteName: "Atom Nexus",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Atom Nexus — Engineer your future",
    description: "Expert-led video courses with multilingual audio. Learn at your own pace.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
