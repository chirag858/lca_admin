import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Public_Sans } from "next/font/google";
import "./globals.css";

const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-public-sans",
});

export const metadata: Metadata = {
  title: "LCA Solutions | Platform admin",
  description: "LCA Solutions platform admin",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className={publicSans.variable}>
        {children}
      </body>
    </html>
  );
}
