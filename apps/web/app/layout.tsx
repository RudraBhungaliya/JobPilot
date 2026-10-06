import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JobPilot - AI Job Search & Auto-Apply Engine",
  description: "Autonomous real-time ATS job matching and auto-apply platform.",
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
    <html lang="en" className="h-full bg-[#f8fafc] text-slate-900">
      <body className="min-h-full flex flex-col bg-[#f8fafc] text-slate-900 antialiased selection:bg-emerald-600/30 selection:text-emerald-950">
        {children}
      </body>
    </html>
  );
}
