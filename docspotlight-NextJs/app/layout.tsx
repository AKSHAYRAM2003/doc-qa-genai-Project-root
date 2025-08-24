import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DocSpotlight",
  description: "Chat with your PDFs using AI",
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/logo-white.svg', type: 'image/svg+xml' }
    ],
    shortcut: '/favicon.svg',
    apple: '/logo-white.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-neutral-950 text-neutral-100 antialiased font-body">
        {children}
      </body>
    </html>
  );
}
