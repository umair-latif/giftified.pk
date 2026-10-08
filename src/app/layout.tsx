import type { Metadata, Viewport } from "next";
import { bagelFatOne, spaceGrotesk } from "./fonts";
import { NavProgress } from "@/components/ui/nav-progress";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "DesignBanana — Custom mugs & T-shirts, designed on your phone",
    template: "%s · DesignBanana",
  },
  description:
    "Put your photos, names and words on a custom mug or T-shirt. Design it on your phone, see it before you order, and pay cash on delivery across Pakistan.",
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
      <body className="min-h-full">
        <NavProgress />
        {children}
      </body>
    </html>
  );
}
