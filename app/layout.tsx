import "./globals.css";
import type { ReactNode } from "react";
export const metadata = { title: "Horse Tinder" };
export default function RootLayout({ children }: { children: ReactNode }) {
  return (<html lang="en"><body className="bg-neutral-950 text-neutral-100">{children}</body></html>);
}
