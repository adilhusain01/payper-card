import { DM_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const bodyFont = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

const monoFont = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-code",
});

export const metadata = {
  title: "PayPer Card - Sui x402 Card Provisioning",
  description: "Provision Lithic virtual cards after Sui USDC settlement through x402.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${monoFont.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
