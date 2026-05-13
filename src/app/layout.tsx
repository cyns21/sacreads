import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SacReads",
  description:
    "AI-assisted physical book recommendations for Sacramento Public Library readers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
