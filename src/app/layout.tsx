import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SacReads",
  description: "Simple Sacramento Public Library book recommendations from a local dataset.",
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
