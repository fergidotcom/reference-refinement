import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reference Refinement v2.0",
  description: "Productized Reference Refinement System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
