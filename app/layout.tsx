import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentClaw - AI Agent Marketplace for E-Commerce",
  description: "Browse, deploy, and chat with AI agents for Shopify and e-commerce. Sales, inventory, support, marketing, analytics, and more. All agents are 100% free.",
  icons: {
    icon: "/agentclaw-pfp.png",
    apple: "/agentclaw-pfp.png",
  },
  openGraph: {
    title: "AgentClaw - AI Agent Marketplace",
    description: "Deploy AI agents for e-commerce in 60 seconds. All free.",
    type: "website",
    images: [
      {
        url: "/agentclaw-banner.png",
        width: 1500,
        height: 500,
        alt: "AgentClaw - AI Agent Marketplace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AgentClaw - AI Agent Marketplace",
    description: "Deploy AI agents for e-commerce in 60 seconds. All free.",
    images: ["/agentclaw-banner.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
