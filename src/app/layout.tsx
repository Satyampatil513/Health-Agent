import type { Metadata, Viewport } from "next";
import NavBar from "@/components/NavBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Health Agent",
  description: "A health and training agent that plans around your real limitations.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Health Agent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <main className="app-main">{children}</main>
        <NavBar />
      </body>
    </html>
  );
}
