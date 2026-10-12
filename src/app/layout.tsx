import type { Metadata, Viewport } from "next";
import { bagelFatOne, spaceGrotesk } from "./fonts";
import { NavProgress } from "@/components/ui/nav-progress";
import { RegisterServiceWorker } from "@/components/pwa/register-service-worker";
import "./globals.css";
import { SITE } from "@/config/site";

export const metadata: Metadata = {
  title: {
    default: `${SITE.name} – ${SITE.tagline}`,
    template: "%s · DesignBanana",
  },
  description:
    "Add your photos, a name or a message to a custom mug, T-shirt or hoodie. Design it yourself, see it on the product before you order, and pay cash on delivery across Pakistan.",
  // iPhone "Add to Home Screen": full-screen app with this name.
  appleWebApp: { capable: true, title: SITE.name, statusBarStyle: "default" },
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
        <RegisterServiceWorker />
        <NavProgress />
        {children}
      </body>
    </html>
  );
}
