import type { Metadata, Viewport } from "next";
import { nunito, poppins } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Giftified.pk — Custom mugs, tees & hoodies",
    template: "%s · Giftified.pk",
  },
  description:
    "Design custom mugs, t-shirts and hoodies on your phone. Cash on Delivery across Pakistan.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Android Chrome: shrink the layout when the keyboard opens so bottom bars stay visible.
  interactiveWidget: "resizes-content",
  themeColor: "#2b8496",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${poppins.variable} ${nunito.variable}`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
