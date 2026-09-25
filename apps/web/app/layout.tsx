import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JobPilot — Autonomous Career Copilot & ATS Automation Engine",
  description: "Autonomous job discovery, intelligent ATS form automation, and human-in-the-loop pipeline intelligence.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-[#090a0f] text-[#f3f4f6]">
      <body className="min-h-full flex flex-col bg-[#090a0f] text-[#f3f4f6] antialiased selection:bg-blue-600/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
