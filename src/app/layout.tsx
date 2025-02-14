import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://resenix-pro.vercel.app"),
  title: {
    default: "ResenixPro | Industrial Equipment Management System",
    template: "%s | ResenixPro - Equipment Management",
  },
  description:
    "Enterprise-grade equipment management and maintenance tracking system. Optimize maintenance schedules, track equipment health, reduce downtime, and enhance operational efficiency with real-time monitoring.",
  keywords: [
    "industrial equipment management",
    "preventive maintenance software",
    "asset tracking system",
    "equipment maintenance dashboard",
    "maintenance scheduling",
    "equipment lifecycle management",
    "maintenance work orders",
    "equipment performance monitoring",
    "industrial maintenance software",
    "asset management solution",
    "equipment downtime tracking",
    "maintenance analytics",
    "predictive maintenance",
    "equipment inventory management",
    "maintenance cost tracking",
  ],
  authors: [
    { name: "ResenixPro", url: "https://resenix-pro.vercel.app/about" },
  ],
  creator: "ResenixPro",
  publisher: "ResenixPro Technologies",
  category: "Technology",
  applicationName: "ResenixPro Dashboard",
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: ["/shortcut-icon.png"],
    apple: [
      { url: "/apple-icon.png" },
      { url: "/apple-icon-57x57.png", sizes: "57x57" },
      { url: "/apple-icon-72x72.png", sizes: "72x72" },
      { url: "/apple-icon-114x114.png", sizes: "114x114" },
      { url: "/apple-icon-180x180.png", sizes: "180x180" },
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/safari-pinned-tab.svg",
        color: "#00ACC1",
      },
    ],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://resenix-pro.vercel.app",
    siteName: "ResenixPro",
    title: "ResenixPro - Industrial Equipment Management System",
    description:
      "Enterprise equipment management and maintenance tracking platform",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ResenixPro Dashboard Preview",
        type: "image/png",
        secureUrl: "https://resenix-pro.vercel.app/og-image.png",
      },
      {
        url: "/og-image-square.png",
        width: 600,
        height: 600,
        alt: "ResenixPro Logo",
        type: "image/png",
        secureUrl: "https://resenix-pro.vercel.app/og-image-square.png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@resenixpro",
    creator: "@resenixpro",
    title: "ResenixPro - Industrial Equipment Management",
    description:
      "Transform your equipment maintenance with our intelligent management system",
    images: {
      url: "/twitter-card.png",
      alt: "ResenixPro Dashboard Preview",
      width: 1200,
      height: 630,
    },
  },
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-site-verification",
    yandex: "your-yandex-verification",
    yahoo: "your-yahoo-verification",
  },
  alternates: {
    canonical: "https://resenix-pro.vercel.app",
    languages: {
      "en-US": "https://resenix-pro.vercel.app/en-us",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="canonical" href="https://resenix-pro.vercel.app" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
