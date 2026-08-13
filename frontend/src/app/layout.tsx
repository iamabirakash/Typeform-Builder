import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Typeform Clone — Make space for good questions", description: "Beautiful forms that feel like a conversation." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
