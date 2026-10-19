import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JobPilot - Career Application & Automation System",
  description: "Direct ATS application pipeline and career profile vault.",
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
    <html lang="en" className="h-full bg-[#0b0f17] text-slate-100 dark">
      <body className="min-h-full flex flex-col bg-[#0b0f17] text-slate-100 antialiased selection:bg-emerald-600/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
