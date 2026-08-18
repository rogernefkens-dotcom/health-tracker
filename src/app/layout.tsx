import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "Health Tracker",
  description: "Persoonlijke health, fitness en voeding tracker",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="nl" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <div className="pb-20">{children}</div>
        <BottomNav />
      </body>
    </html>
  );
}
