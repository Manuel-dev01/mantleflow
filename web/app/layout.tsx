import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MantleFlow — RWA Distribution Router",
  description:
    "Maps the distribution (not issuance) of tokenized/RWA assets on Mantle: where can an asset be bought, sold, borrowed against, bridged — and who is gated.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
