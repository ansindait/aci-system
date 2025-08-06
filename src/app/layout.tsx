import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SidebarProvider } from "../context/SidebarContext";
import ClientLayout from "./components/ClientLayout";
import React from "react";
import type { Metadata, Viewport } from "next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Metadata configuration
export const metadata: Metadata = {
  title: "Ansinda Communication Indonesia System",
  description: "A System for Ansinda Communication Indonesia",
  icons: {
    icon: [
      {
        url: '/logo.jpeg?v=2',
        sizes: '16x16',
        type: 'image/jpeg',
      },
      {
        url: '/logo.jpeg?v=2',
        sizes: '32x32',
        type: 'image/jpeg',
      },
      {
        url: '/logo.jpeg?v=2',
        sizes: '48x48',
        type: 'image/jpeg',
      },
    ],
    apple: [
      {
        url: '/logo.jpeg?v=2',
        sizes: '180x180',
        type: 'image/jpeg',
      },
    ],
    shortcut: '/logo.jpeg?v=2',
  },
  manifest: '/manifest.json',
};

// Viewport configuration
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000',
};

export default function RootLayout({ children }: React.PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/jpeg" href="/logo.jpeg?v=2" />
        <link rel="shortcut icon" type="image/jpeg" href="/logo.jpeg?v=2" />
        <link rel="apple-touch-icon" href="/logo.jpeg?v=2" />
        <link rel="apple-touch-icon-precomposed" href="/logo.jpeg?v=2" />
        <meta name="theme-color" content="#000000" />
        <meta name="msapplication-TileColor" content="#000000" />
        <meta name="msapplication-TileImage" content="/logo.jpeg?v=2" />
        <meta name="msapplication-config" content="none" />
        <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta http-equiv="Pragma" content="no-cache" />
        <meta http-equiv="Expires" content="0" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SidebarProvider>
          <ClientLayout>{children}</ClientLayout>
        </SidebarProvider>
      </body>
    </html>
  );
}