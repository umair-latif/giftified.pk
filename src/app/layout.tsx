import type { Metadata, Viewport } from "next";
import { bagelFatOne, spaceGrotesk } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "DesignBanana — Custom mugs, tees & hoodies",
    template: "%s · DesignBanana",
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
  themeColor: "#14b8a6",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${spaceGrotesk.variable} ${bagelFatOne.variable}`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
