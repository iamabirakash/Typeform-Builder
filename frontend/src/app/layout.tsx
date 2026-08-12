import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Typeform Clone", description: "A focused form builder" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
