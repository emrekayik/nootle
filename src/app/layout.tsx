import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nootle",
  description: "Your personal note-taking assistant",
};
import { Toaster } from "@/components/ui/sonner";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { OnboardingGuide } from "@/components/onboarding-guide";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TooltipProvider>
          <SidebarProvider>
            <AppSidebar />
            <main className="flex-1 overflow-x-hidden flex flex-col min-h-screen w-full">
              {/* Mobile Header */}
              <header className="md:hidden sticky top-0 z-50 flex h-14 w-full items-center gap-3 border-b bg-background/80 backdrop-blur px-4">
                <SidebarTrigger />
                <span className="font-bold tracking-tight text-lg">Nootle</span>
              </header>
              {/* Page Content */}
              <div className="flex-1 h-full w-full">{children}</div>
            </main>
          </SidebarProvider>
        </TooltipProvider>
        <Toaster />
        <OnboardingGuide />
      </body>
    </html>
  );
}
