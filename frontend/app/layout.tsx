import type { Metadata, Viewport } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "Steps Leaderboard",
  description: "Log daily steps and compete with friends.",
};

export const viewport: Viewport = {
  themeColor: "#0b0f17",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">
        <Nav />
        <main className="mx-auto max-w-md px-4 pb-16 pt-4">{children}</main>
      </body>
    </html>
  );
}
